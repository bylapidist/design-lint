import type { LintMessage, RuleModule } from './types';
import { lintVue } from './framework-parsers/vue-parser';
import { lintSvelte } from './framework-parsers/svelte-parser';
import { lintTS } from './framework-parsers/ts-parser';
import { lintCSS } from './framework-parsers/css-parser';

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
