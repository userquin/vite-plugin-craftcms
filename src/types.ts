import { HTMLElement } from "node-html-parser";
import { ResolvedConfig } from "vite";

export interface ParsedHtml {
  head: HTMLElement[];
  body: HTMLElement[];
}

export interface TemplateParams extends Partial<ParsedHtml> {
  basePath?: string;
  proxyUrl?: string;
  mode?: string;
}

export interface CmsCraftPluginOptions {
  /**
   * @default Infinity
   */
  concurrency?: number
  /**
   * @default './templates/_partials/vite.twig'
   */
  outputFile?: string
  /**
   * The template to apply.
   */
  template?: (templateParams: TemplateParams) => string
  /**
   * @default 'http://localhost'
   */
  devServerBaseAddress?: string
}

// internal resolved options: all options required except concurrency
export interface ResolvedCmsCraftOptions extends Required<Exclude<CmsCraftPluginOptions, 'concurrency'>> {
  config: ResolvedConfig
  basePath: string
  proxyUrl: string
}
