import type {
  LintMessage,
  RegisteredRuleListener,
  TokenReferenceCandidate,
} from './types.js';
import { lintVue } from './framework-parsers/vue-parser.js';
import { lintSvelte } from './framework-parsers/svelte-parser.js';
import { lintTS } from './framework-parsers/ts-parser.js';
import { lintCSS } from './framework-parsers/css-parser.js';

export interface ParserPassResult {
  tokenReferences?: TokenReferenceCandidate[];
}

export type ParserStrategy = (
  text: string,
  sourceId: string,
  listeners: RegisteredRuleListener[],
  messages: LintMessage[],
) => Promise<ParserPassResult> | ParserPassResult;

export const parserRegistry: Partial<Record<string, ParserStrategy>> = {
  vue: lintVue,
  svelte: lintSvelte,
  ts: lintTS,
  css: lintCSS,
};
