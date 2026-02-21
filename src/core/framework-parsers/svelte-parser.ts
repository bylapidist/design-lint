import ts from 'typescript';
import { parseCSS } from './css-parser.js';
import type {
  CSSDeclaration,
  LintMessage,
  RegisteredRuleListener,
} from '../types.js';
import type { parse as svelteParse } from 'svelte/compiler';
import { guards, collections } from '../../utils/index.js';
import type { ParserPassResult } from '../parser-registry.js';
import type { ParserPassOptions } from '../parser-registry.js';
import {
  collectDeclarationTokenReferences,
  collectTsTokenReferences,
} from './token-references.js';
import {
  dispatchCSSDeclarationListener,
  dispatchNodeListener,
} from './listener-dispatch.js';
import { normalizeStylePropertyName } from './reference-normalizer.js';

const {
  data: { isRecord },
} = guards;
const { isArray } = collections;

export async function lintSvelte(
  text: string,
  sourceId: string,
  listeners: RegisteredRuleListener[],
  messages: LintMessage[],
  _options?: ParserPassOptions,
): Promise<ParserPassResult> {
  void _options;
  const tokenReferences: NonNullable<ParserPassResult['tokenReferences']> = [];
  const dispatchContext = {
    listeners,
    messages,
    sourceId,
    failedHooks: new Set<string>(),
  };
  const { parse }: { parse: typeof svelteParse } =
    await import('svelte/compiler');
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

  const unwrapStaticExpression = (expression: ts.Expression): ts.Expression => {
    let current = expression;
    for (;;) {
      if (ts.isParenthesizedExpression(current)) {
        current = current.expression;
        continue;
      }
      if (ts.isAsExpression(current)) {
        current = current.expression;
        continue;
      }
      if (ts.isSatisfiesExpression(current)) {
        current = current.expression;
        continue;
      }
      if (ts.isNonNullExpression(current)) {
        current = current.expression;
        continue;
      }
      break;
    }
    return current;
  };

  const parseStaticExpressionValue = (
    expressionText: string,
  ): string | null => {
    const wrapped = `(${expressionText});`;
    const source = ts.createSourceFile(
      'svelte-style-expression.ts',
      wrapped,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const statement = source.statements[0];
    if (!ts.isExpressionStatement(statement)) {
      return null;
    }
    const expression = unwrapStaticExpression(statement.expression);
    if (
      ts.isStringLiteral(expression) ||
      ts.isNoSubstitutionTemplateLiteral(expression)
    ) {
      return expression.text;
    }
    if (ts.isNumericLiteral(expression)) {
      return expression.text;
    }
    if (
      ts.isPrefixUnaryExpression(expression) &&
      ts.isNumericLiteral(expression.operand) &&
      (expression.operator === ts.SyntaxKind.PlusToken ||
        expression.operator === ts.SyntaxKind.MinusToken)
    ) {
      const sign = expression.operator === ts.SyntaxKind.MinusToken ? '-' : '';
      return `${sign}${expression.operand.text}`;
    }
    return null;
  };

  const toStaticStyleValue = (
    parts: {
      type: string;
      data?: string;
      expression?: { start?: number; end?: number } | undefined;
      start?: number;
      end?: number;
    }[],
  ): string | null => {
    let value = '';
    for (const part of parts) {
      if (part.type === 'Text') {
        value += part.data ?? '';
        continue;
      }
      if (
        (part.type !== 'MustacheTag' && part.type !== 'ExpressionTag') ||
        !part.expression
      ) {
        return null;
      }
      const expressionStart =
        typeof part.expression.start === 'number'
          ? part.expression.start
          : typeof part.start === 'number'
            ? part.start
            : undefined;
      const expressionEnd =
        typeof part.expression.end === 'number'
          ? part.expression.end
          : typeof part.end === 'number'
            ? part.end
            : undefined;
      if (expressionStart === undefined || expressionEnd === undefined) {
        return null;
      }
      const expressionText = text.slice(expressionStart, expressionEnd);
      const staticValue = parseStaticExpressionValue(expressionText);
      if (staticValue === null) {
        return null;
      }
      value += staticValue;
    }
    return value;
  };

  const extractStyleAttribute = (attr: {
    start: number;
    end: number;
    value: {
      type: string;
      data?: string;
      expression?: { start?: number; end?: number } | undefined;
      start?: number;
      end?: number;
    }[];
  }): CSSDeclaration[] => {
    const resolvedExpressions: string[] = [];
    const dynamicExpressionPlaceholders = new Set<string>();
    let content = '';
    for (const part of attr.value) {
      if (part.type === 'Text') {
        content += part.data ?? '';
        continue;
      }
      if (
        (part.type !== 'MustacheTag' && part.type !== 'ExpressionTag') ||
        !part.expression
      ) {
        return [];
      }
      const expressionStart =
        typeof part.expression.start === 'number'
          ? part.expression.start
          : typeof part.start === 'number'
            ? part.start
            : undefined;
      const expressionEnd =
        typeof part.expression.end === 'number'
          ? part.expression.end
          : typeof part.end === 'number'
            ? part.end
            : undefined;
      if (expressionStart === undefined || expressionEnd === undefined) {
        return [];
      }
      const expressionText = text.slice(expressionStart, expressionEnd);
      const staticValue = parseStaticExpressionValue(expressionText);
      const index = resolvedExpressions.length;
      if (staticValue === null) {
        const marker = `__DYNAMIC_${String(index)}__`;
        dynamicExpressionPlaceholders.add(marker);
        resolvedExpressions.push(marker);
      } else {
        resolvedExpressions.push(staticValue);
      }
      content += `__EXPR_${String(index)}__`;
    }
    const attrText = text.slice(attr.start, attr.end);
    const eqIdx = attrText.indexOf('=');
    const valueStart = attr.start + eqIdx + 2;
    const regex = /([^:;]+?)\s*:\s*([^;]+?)(?:;|$)/g;
    const decls: CSSDeclaration[] = [];
    let m: RegExpExecArray | null;
    while ((m = regex.exec(content))) {
      const prop = m[1].trim();
      const value = m[2]
        .trim()
        .replace(/__EXPR_(\d+)__/g, (_, i) => resolvedExpressions[Number(i)]);
      if (
        Array.from(dynamicExpressionPlaceholders).some((marker) =>
          value.includes(marker),
        )
      ) {
        continue;
      }
      const { line, column } = getLineAndColumn(valueStart + m.index);
      decls.push({
        prop: normalizeStylePropertyName(prop),
        value,
        line,
        column,
      });
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
        const value = toStaticStyleValue(attrRaw.value)?.trim();
        if (value === undefined || value.length === 0) {
          continue;
        }
        const { line, column } = getLineAndColumn(attrRaw.start);
        styleDecls.push({
          prop: normalizeStylePropertyName(attrRaw.name),
          value,
          line,
          column,
        });
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
      collectTsTokenReferences(node, source, tokenReferences, 'svelte:ts');
      dispatchNodeListener(dispatchContext, node, source);
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  for (const decl of styleDecls) {
    collectDeclarationTokenReferences(decl, tokenReferences, 'svelte:style');
    dispatchCSSDeclarationListener(dispatchContext, decl);
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
      collectDeclarationTokenReferences(decl, tokenReferences, 'svelte:css');
      dispatchCSSDeclarationListener(dispatchContext, decl);
    }
  }
  return { tokenReferences };
}

function isSvelteAttr(value: unknown): value is {
  type: string;
  name: string;
  start: number;
  end: number;
  value: {
    type: string;
    data?: string;
    expression?: { start?: number; end?: number } | undefined;
    start?: number;
    end?: number;
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
