import postcss from 'postcss';
import { parse as scssParser } from 'postcss-scss';
import lessSyntax from 'postcss-less';
import type {
  CSSDeclaration,
  LintMessage,
  RegisteredRuleListener,
} from '../types.js';
import { guards } from '../../utils/index.js';
import type { ParserPassResult } from '../parser-registry.js';
import { collectDeclarationTokenReferences } from './token-references.js';
import { dispatchCSSDeclarationListener } from './listener-dispatch.js';

const {
  data: { isObject },
} = guards;

const UNSUPPORTED_SASS_MESSAGE =
  'Indented .sass syntax is not supported; use .scss instead.';

function normalizeParseLocation(value: unknown): number {
  return typeof value === 'number' &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= 1
    ? value
    : 1;
}

function pushParseError(
  messages: LintMessage[],
  message: unknown,
  line?: unknown,
  column?: unknown,
): void {
  messages.push({
    ruleId: 'parse-error',
    message: typeof message === 'string' ? message : 'Failed to parse CSS',
    severity: 'error',
    line: normalizeParseLocation(line),
    column: normalizeParseLocation(column),
  });
}

export function parseCSS(
  text: string,
  messages: LintMessage[] = [],
  lang?: string,
): CSSDeclaration[] {
  const decls: CSSDeclaration[] = [];
  if (lang === 'sass') {
    pushParseError(messages, UNSUPPORTED_SASS_MESSAGE, 1, 1);
    return decls;
  }
  try {
    const root =
      lang === 'scss'
        ? scssParser(text)
        : lang === 'less'
          ? lessSyntax.parse(text)
          : postcss.parse(text);
    root.walkDecls((d) => {
      decls.push({
        prop: d.prop,
        value: d.value,
        line: d.source?.start?.line ?? 1,
        column: d.source?.start?.column ?? 1,
      });
    });
  } catch (e: unknown) {
    const err: { message?: unknown; line?: unknown; column?: unknown } =
      isObject(e) ? e : {};
    pushParseError(messages, err.message, err.line, err.column);
  }
  return decls;
}

export function lintCSS(
  text: string,
  sourceId: string,
  listeners: RegisteredRuleListener[],
  messages: LintMessage[],
): ParserPassResult {
  const lower = sourceId.toLowerCase();
  let lang: string | undefined;
  if (lower.endsWith('.scss')) lang = 'scss';
  else if (lower.endsWith('.sass')) lang = 'sass';
  else if (lower.endsWith('.less')) lang = 'less';
  const decls = parseCSS(text, messages, lang);
  const tokenReferences: ParserPassResult['tokenReferences'] = [];
  const dispatchContext = {
    listeners,
    messages,
    sourceId,
    failedHooks: new Set<string>(),
  };
  for (const decl of decls) {
    collectDeclarationTokenReferences(decl, tokenReferences, 'css');
    dispatchCSSDeclarationListener(dispatchContext, decl);
  }
  return { tokenReferences };
}
