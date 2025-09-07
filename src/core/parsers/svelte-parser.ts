import ts from 'typescript';
import { parseCSS } from './css-parser.js';
import type { CSSDeclaration, LintMessage, RuleModule } from '../types.js';
import type { parse as svelteParse } from 'svelte/compiler';

export async function lintSvelte(
  text: string,
  filePath: string,
  listeners: ReturnType<RuleModule['create']>[],
  messages: LintMessage[],
): Promise<void> {
  const { parse }: { parse: typeof svelteParse } = await import(
    'svelte/compiler'
  );
  const ast = parse(text);
  const scripts: string[] = [];
  if (ast.instance)
    scripts.push(
      text.slice(ast.instance.content.start, ast.instance.content.end),
    );
  if (ast.module)
    scripts.push(text.slice(ast.module.content.start, ast.module.content.end));
  const styleDecls: CSSDeclaration[] = [];
  const replacements: { start: number; end: number; text: string }[] = [];
  const getLineAndColumn = (pos: number) => {
    const sliced = text.slice(0, pos).split(/\r?\n/);
    const line = sliced.length;
    const column = sliced[sliced.length - 1].length + 1;
    return { line, column };
  };
  const extractStyleAttribute = (attr: {
    start: number;
    end: number;
    value: {
      type: string;
      data?: string;
      expression?: { start: number; end: number };
    }[];
  }): CSSDeclaration[] => {
    const exprs: string[] = [];
    let content = '';
    for (const part of attr.value) {
      if (part.type === 'Text') content += part.data ?? '';
      else if (part.type === 'MustacheTag' && part.expression) {
        const i = exprs.length;
        exprs.push(text.slice(part.expression.start, part.expression.end));
        content += `__EXPR_${String(i)}__`;
      }
    }
    const attrText = text.slice(attr.start, attr.end);
    const eqIdx = attrText.indexOf('=');
    const valueStart = attr.start + eqIdx + 2;
    const regex = /([^:;]+?)\s*:\s*([^;]+?)(?:;|$)/g;
    const decls: CSSDeclaration[] = [];
    let m: RegExpExecArray | null;
    while ((m = regex.exec(content))) {
      const prop = m[1].trim();
      let value = m[2]
        .trim()
        .replace(/__EXPR_(\d+)__/g, (_, i) => exprs[Number(i)]);
      const { line, column } = getLineAndColumn(valueStart + m.index);
      decls.push({ prop, value, line, column });
    }
    return decls;
  };
  const walk = (node: unknown): void => {
    if (!isRecord(node)) return;
    const attrs = Array.isArray(node.attributes) ? node.attributes : [];
    for (const attrRaw of attrs) {
      if (!isSvelteAttr(attrRaw)) continue;
      if (attrRaw.type === 'Attribute' && attrRaw.name === 'style') {
        styleDecls.push(...extractStyleAttribute(attrRaw));
        replacements.push({
          start: attrRaw.start,
          end: attrRaw.end,
          text: 'style={{}}',
        });
      } else if (attrRaw.type === 'StyleDirective') {
        const value = attrRaw.value
          .map((v) => {
            if (v.type === 'Text') return v.data;
            return v.expression
              ? text.slice(v.expression.start, v.expression.end)
              : '';
          })
          .join('')
          .trim();
        const { line, column } = getLineAndColumn(attrRaw.start);
        styleDecls.push({ prop: attrRaw.name, value, line, column });
        replacements.push({ start: attrRaw.start, end: attrRaw.end, text: '' });
      }
    }
    const children = Array.isArray(node.children) ? node.children : [];
    for (const child of children) walk(child);
  };
  walk(ast.html);
  const templateStart = ast.html?.start ?? 0;
  let template = ast.html ? text.slice(ast.html.start, ast.html.end) : '';
  replacements
    .sort((a, b) => b.start - a.start)
    .forEach((r) => {
      const start = r.start - templateStart;
      const end = r.end - templateStart;
      template = template.slice(0, start) + r.text + template.slice(end);
    });
  const templateTsx = template.replace(/class=/g, 'className=');
  const scriptBlocks = scripts.length ? scripts : [''];
  for (const scriptContent of scriptBlocks) {
    const combined = `${scriptContent}\nfunction __render(){ return (${templateTsx}); }`;
    const source = ts.createSourceFile(
      filePath,
      combined,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const visit = (node: ts.Node) => {
      for (const l of listeners) l.onNode?.(node);
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  for (const decl of styleDecls) {
    for (const l of listeners) l.onCSSDeclaration?.(decl);
  }
  if (ast.css) {
    const styleText = text.slice(ast.css.content.start, ast.css.content.end);
    const langAttr =
      isRecord(ast.css) && Array.isArray(ast.css.attributes)
        ? ast.css.attributes.find(
            (a): a is { name: string; value?: { data?: string }[] } =>
              isRecord(a) && typeof a.name === 'string' && a.name === 'lang',
          )
        : undefined;
    const lang =
      langAttr &&
      Array.isArray(langAttr.value) &&
      typeof langAttr.value[0]?.data === 'string'
        ? langAttr.value[0].data
        : undefined;
    const decls = parseCSS(styleText, messages, lang);
    for (const decl of decls) {
      for (const l of listeners) l.onCSSDeclaration?.(decl);
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSvelteAttr(value: unknown): value is {
  type: string;
  name: string;
  start: number;
  end: number;
  value: {
    type: string;
    data?: string;
    expression?: { start: number; end: number };
  }[];
} {
  return (
    isRecord(value) &&
    typeof value.type === 'string' &&
    typeof value.name === 'string' &&
    typeof value.start === 'number' &&
    typeof value.end === 'number' &&
    Array.isArray(value.value)
  );
}
