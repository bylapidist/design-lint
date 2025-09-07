import type { LintMessage, RuleModule } from './types.js';
import { lintVue } from './parsers/vue-parser.js';
import { lintSvelte } from './parsers/svelte-parser.js';
import { lintTS } from './parsers/ts-parser.js';
import { lintCSS } from './parsers/css-parser.js';

export type ParserStrategy = (
  text: string,
  filePath: string,
  listeners: ReturnType<RuleModule['create']>[],
  messages: LintMessage[],
) => Promise<void> | void;

export const parserRegistry: Partial<Record<string, ParserStrategy>> = {
  '.vue': lintVue,
  '.svelte': lintSvelte,
  '.ts': lintTS,
  '.tsx': lintTS,
  '.mts': lintTS,
  '.cts': lintTS,
  '.js': lintTS,
  '.jsx': lintTS,
  '.mjs': lintTS,
  '.cjs': lintTS,
  '.css': lintCSS,
  '.scss': lintCSS,
  '.sass': lintCSS,
  '.less': lintCSS,
};
