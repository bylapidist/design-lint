import postcss, { type Root } from 'postcss';
import { parse as scssParse } from 'postcss-scss';
import lessSyntax from 'postcss-less';
import type { CSSDeclaration, LintMessage, RuleModule } from '../types.js';

export function parseCSS(
  text: string,
  messages: LintMessage[] = [],
  lang?: string,
): CSSDeclaration[] {
  const decls: CSSDeclaration[] = [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const root: Root =
      lang === 'scss' || lang === 'sass'
        ? // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          scssParse(text)
        : lang === 'less'
          ? // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            lessSyntax.parse(text)
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
    const err = isRecord(e) ? e : {};
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
  listeners: ReturnType<RuleModule['create']>[],
  messages: LintMessage[],
): void {
  const lower = sourceId.toLowerCase();
  let lang: string | undefined;
  if (lower.endsWith('.scss') || lower.endsWith('.sass')) lang = 'scss';
  else if (lower.endsWith('.less')) lang = 'less';
  const decls = parseCSS(text, messages, lang);
  for (const decl of decls) {
    for (const l of listeners) l.onCSSDeclaration?.(decl);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
