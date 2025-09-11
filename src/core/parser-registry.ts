import type { LintMessage, RuleModule } from './types.js';
import { lintVue } from './framework-parsers/vue-parser.js';
import { lintSvelte } from './framework-parsers/svelte-parser.js';
import { lintTS } from './framework-parsers/ts-parser.js';
import { lintCSS } from './framework-parsers/css-parser.js';

export type ParserStrategy = (
  text: string,
  sourceId: string,
  listeners: ReturnType<RuleModule['create']>[],
  messages: LintMessage[],
) => Promise<void> | void;

export const parserRegistry: Partial<Record<string, ParserStrategy>> = {
  vue: lintVue,
  svelte: lintSvelte,
  ts: lintTS,
  css: lintCSS,
};
