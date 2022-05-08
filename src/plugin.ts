import fs from "fs";
import path from "path";
import { Plugin, ResolvedConfig } from "vite";
import { defaultTemplateFunction, parseFile } from "./utils";
import { CmsCraftPluginOptions, ResolvedCmsCraftOptions } from "./types";

// cjs not working as expected: p-queue provides only ESM
async function createPQueue(): Promise<typeof import("p-queue").default> {
  return (await import("p-queue")).default
}

export default function craftPartials(options: CmsCraftPluginOptions = {}) {

  let resolvedOptions: ResolvedCmsCraftOptions | undefined

  let queue: import('p-queue').default | undefined

  return {
    name: "craftcms",
    enforce: "post",

    async configResolved(resolvedConfig: ResolvedConfig) {
      const {
        concurrency = Infinity,
        outputFile = "./templates/_partials/vite.twig",
        template = defaultTemplateFunction,
        devServerBaseAddress = "http://localhost"
      } = options

      const { base, server, mode } = resolvedConfig;

      resolvedOptions = <ResolvedCmsCraftOptions>{
        config: resolvedConfig,
        outputFile,
        template,
        devServerBaseAddress,
        basePath: base,
        proxyUrl: `${devServerBaseAddress}:${server.port || 3000}`
      }

      if (mode === 'production') {
        queue = new (await createPQueue())({ concurrency, autoStart: false })
      }
    },

    buildStart({ input }: any) {
      const { config: { mode }, outputFile, template, basePath, proxyUrl } = resolvedOptions!!;
      if (mode === "production") {
        return;
      }

      const inputFile = fs.readFileSync(input);
      const { head, body} = parseFile(inputFile.toString());

      fs.writeFileSync(
        outputFile,
        template({ head, body, basePath, mode, proxyUrl })
      );
    },

/*
    transformIndexHtml: {
      enforce: 'post',
      transform(html: string, { filename, bundle }) {
        const { config: { mode }, outputFile, template, basePath, proxyUrl } = resolvedOptions!!;

        if (mode !== "production") {
          return;
        }

        queue!.add(async() => {
          const { head, body} = parseFile(html);
          fs.writeFileSync(outputFile, template({ head, body, basePath, mode, proxyUrl }));
        })
      },
    },

*/
    async buildEnd(err) {
      if (err) {
        throw err
      }
    },

    writeBundle(_, bundle) {
      const { config: { mode }, outputFile, template, basePath, proxyUrl } = resolvedOptions!!;

      if (mode !== "production") {
        return;
      }

      Object.keys(bundle).forEach(e => {
        const asset = bundle[e]
        if (asset.fileName.match(/\.html$/) && 'source' in asset) {
          queue!.add(async() => {
            console.log(`Generating ${asset.fileName} template...`)
            const { head, body} = parseFile(asset.source.toString());
            fs.writeFileSync(outputFile, template({ head, body, basePath, mode, proxyUrl }));
          })
        }
      })
    },


    async closeBundle() {
      if (queue) {
        console.log("Generating templates...");
        await queue.start().onIdle()
      }

      console.log("Removing src files in dist ...");
      const { root, build: { outDir } } = resolvedOptions!.config;
      const outputPath = path.resolve(
        root,
        outDir,
        "./src"
      );

      fs.rmSync(outputPath, {
        recursive: true,
        force: true,
      });
    },
  } as Plugin;
}
