import ts from 'typescript';
import { parseCSS } from './css-parser.js';
import type { CSSDeclaration, LintMessage, RuleModule } from '../types.js';
import type { parse as svelteParse } from 'svelte/compiler';
import { guards, collections } from '../../utils/index.js';

const { isRecord } = guards.data;
const { isArray } = collections;

export async function lintSvelte(
  text: string,
  sourceId: string,
  listeners: ReturnType<RuleModule['create']>[],
  messages: LintMessage[],
): Promise<void> {
  const { parse }: { parse: typeof svelteParse } = await import(
    'svelte/compiler'
  );
  const ast = parse(text, { modern: true });
  const getRange = (node: unknown): { start: number; end: number } | null => {
    return isRecord(node) &&
      typeof node.start === 'number' &&
      typeof node.end === 'number'
      ? { start: node.start, end: node.end }
      : null;
  };
  const scripts: string[] = [];
  const instanceRange = ast.instance ? getRange(ast.instance.content) : null;
  if (instanceRange)
    scripts.push(text.slice(instanceRange.start, instanceRange.end));
  const moduleRange = ast.module ? getRange(ast.module.content) : null;
  if (moduleRange) scripts.push(text.slice(moduleRange.start, moduleRange.end));
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
  const toNodesArray = (value: unknown): unknown[] =>
    isArray(value) ? value : [];
  const getNodes = (node: Record<string, unknown>): unknown[] => {
    const nodes: unknown[] = [];
    nodes.push(...toNodesArray(node.nodes));
    nodes.push(...toNodesArray(node.children));
    const frag = node.fragment;
    nodes.push(...toNodesArray(isRecord(frag) ? frag.nodes : undefined));
    for (const key of [
      'consequent',
      'alternate',
      'body',
      'fallback',
      'pending',
      'then',
      'catch',
    ]) {
      const value = node[key];
      nodes.push(...toNodesArray(isRecord(value) ? value.nodes : undefined));
    }
    return nodes;
  };
  const walk = (node: unknown): void => {
    if (!isRecord(node)) return;
    const attrs = isArray(node.attributes) ? node.attributes : [];
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
    for (const child of getNodes(node)) walk(child);
  };
  walk(ast.fragment);
  const templateStart = ast.start;
  let template = text.slice(ast.start, ast.end);
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
      sourceId,
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
      isRecord(ast.css) && isArray(ast.css.attributes)
        ? ast.css.attributes.find(
            (a): a is { name: string; value?: { data?: string }[] } =>
              isRecord(a) && typeof a.name === 'string' && a.name === 'lang',
          )
        : undefined;
    const lang =
      langAttr &&
      isArray(langAttr.value) &&
      typeof langAttr.value[0]?.data === 'string'
        ? langAttr.value[0].data
        : undefined;
    const decls = parseCSS(styleText, messages, lang);
    for (const decl of decls) {
      for (const l of listeners) l.onCSSDeclaration?.(decl);
    }
  }
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
    isArray(value.value)
  );
}
