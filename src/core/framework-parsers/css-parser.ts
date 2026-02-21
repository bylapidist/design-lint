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

export function parseCSS(
  text: string,
  messages: LintMessage[] = [],
  lang?: string,
): CSSDeclaration[] {
  const decls: CSSDeclaration[] = [];
  try {
    const root =
      lang === 'scss' || lang === 'sass'
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
    messages.push({
      ruleId: 'parse-error',
      message:
        typeof err.message === 'string' ? err.message : 'Failed to parse CSS',
      severity: 'error',
      line: typeof err.line === 'number' ? err.line : 1,
      column: typeof err.column === 'number' ? err.column : 1,
    });
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
  if (lower.endsWith('.scss') || lower.endsWith('.sass')) lang = 'scss';
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
