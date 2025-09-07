import ts from 'typescript';
import postcss, { type Parser, type Root } from 'postcss';
import { parse as scssParseRaw } from 'postcss-scss';
import postcssLess from 'postcss-less';

const scssParse: Parser<Root> = scssParseRaw as unknown as Parser<Root>;
const lessParse: Parser<Root> = (
  postcssLess as unknown as { parse: Parser<Root> }
).parse;
import type { parse as svelteParse } from 'svelte/compiler';
import type {
  DesignTokens,
  RuleModule,
  LintMessage,
  LintResult,
  CSSDeclaration,
  RuleContext,
} from './types.js';
import { mergeTokens } from './token-loader.js';

export class ParserService {
  constructor(private tokensByTheme: Record<string, DesignTokens>) {}

  async lintText(
    text: string,
    filePath: string,
    enabled: {
      rule: RuleModule;
      options: unknown;
      severity: 'error' | 'warn';
    }[],
  ): Promise<LintResult> {
    const messages: LintMessage[] = [];
    const ruleDescriptions: Record<string, string> = {};
    const disabledLines = getDisabledLines(text);
    const listeners = enabled.map(({ rule, options, severity }) => {
      ruleDescriptions[rule.name] = rule.meta.description;
      const themes =
        isRecord(options) && isStringArray(options.themes)
          ? options.themes
          : undefined;
      const tokens = mergeTokens(this.tokensByTheme, themes);
      const ctx: RuleContext = {
        filePath,
        tokens,
        options,
        report: (m) => messages.push({ ...m, severity, ruleId: rule.name }),
      };
      return rule.create(ctx);
    });

    if (filePath.endsWith('.vue')) {
      await lintVue(text, filePath, listeners, messages);
    } else if (filePath.endsWith('.svelte')) {
      await lintSvelte(text, filePath, listeners, messages);
    } else if (/\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/.test(filePath)) {
      lintTS(text, filePath, listeners, messages);
    } else {
      const lower = filePath.toLowerCase();
      if (
        lower.endsWith('.css') ||
        lower.endsWith('.scss') ||
        lower.endsWith('.sass') ||
        lower.endsWith('.less')
      ) {
        let syntax: string | undefined;
        if (lower.endsWith('.scss') || lower.endsWith('.sass')) syntax = 'scss';
        else if (lower.endsWith('.less')) syntax = 'less';
        const decls = parseCSS(text, messages, syntax);
        for (const decl of decls) {
          for (const l of listeners) l.onCSSDeclaration?.(decl);
        }
      }
    }
    const filtered = messages.filter((m) => !disabledLines.has(m.line));
    return { filePath, messages: filtered, ruleDescriptions };
  }
}

async function lintVue(
  text: string,
  filePath: string,
  listeners: ReturnType<RuleModule['create']>[],
  messages: LintMessage[],
): Promise<void> {
  const { parse } = await import('@vue/compiler-sfc');
  const { descriptor } = parse(text, { filename: filePath });
  const template = descriptor.template?.content ?? '';
  const templateTsx = template
    .replace(/class=/g, 'className=')
    .replace(
      /:style="{([^}]+)}"/g,
      (_: string, expr: string) => `style={{ ${expr.trim()} }}`,
    );
  const scripts: string[] = [];
  if (descriptor.script?.content) scripts.push(descriptor.script.content);
  if (descriptor.scriptSetup?.content)
    scripts.push(descriptor.scriptSetup.content);
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
  for (const style of descriptor.styles) {
    const lang = typeof style.lang === 'string' ? style.lang : undefined;
    const decls = parseCSS(style.content, messages, lang);
    for (const decl of decls) {
      for (const l of listeners) l.onCSSDeclaration?.(decl);
    }
  }
}

async function lintSvelte(
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

function lintTS(
  text: string,
  filePath: string,
  listeners: ReturnType<RuleModule['create']>[],
  messages: LintMessage[],
): void {
  const source = ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.Latest,
    true,
  );
  const getRootTag = (expr: ts.Expression): string | null => {
    if (ts.isIdentifier(expr)) return expr.text;
    if (
      ts.isPropertyAccessExpression(expr) ||
      ts.isElementAccessExpression(expr)
    ) {
      return getRootTag(expr.expression);
    }
    if (ts.isCallExpression(expr)) {
      return getRootTag(expr.expression);
    }
    return null;
  };
  const visit = (node: ts.Node) => {
    for (const l of listeners) l.onNode?.(node);
    if (
      ts.isJsxAttribute(node) &&
      node.name.getText() === 'style' &&
      node.initializer &&
      ts.isStringLiteral(node.initializer)
    ) {
      const init = node.initializer;
      const start = source.getLineAndCharacterOfPosition(
        init.getStart(source) + 1,
      );
      const tempMessages: LintMessage[] = [];
      const decls = parseCSS(init.text, tempMessages);
      for (const decl of decls) {
        const line = start.line + decl.line - 1;
        const column =
          decl.line === 1 ? start.character + decl.column - 1 : decl.column;
        for (const l of listeners)
          l.onCSSDeclaration?.({ ...decl, line, column });
      }
      for (const m of tempMessages) {
        const line = start.line + m.line - 1;
        const column = m.line === 1 ? start.character + m.column - 1 : m.column;
        messages.push({ ...m, line, column });
      }
      return;
    } else if (ts.isTaggedTemplateExpression(node)) {
      const root = getRootTag(node.tag);
      if (
        root &&
        ['styled', 'css', 'tw'].includes(root) &&
        ts.isNoSubstitutionTemplateLiteral(node.template)
      ) {
        const tpl = node.template;
        const start = source.getLineAndCharacterOfPosition(
          tpl.getStart(source) + 1,
        );
        const tempMessages: LintMessage[] = [];
        const decls = parseCSS(tpl.text, tempMessages);
        for (const decl of decls) {
          const line = start.line + decl.line - 1;
          const column =
            decl.line === 1 ? start.character + decl.column - 1 : decl.column;
          for (const l of listeners)
            l.onCSSDeclaration?.({ ...decl, line, column });
        }
        for (const m of tempMessages) {
          const line = start.line + m.line - 1;
          const column =
            m.line === 1 ? start.character + m.column - 1 : m.column;
          messages.push({ ...m, line, column });
        }
        return;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}

function parseCSS(
  text: string,
  messages: LintMessage[] = [],
  lang?: string,
): CSSDeclaration[] {
  const decls: CSSDeclaration[] = [];
  try {
    const root: Root =
      lang === 'scss' || lang === 'sass'
        ? scssParse(text)
        : lang === 'less'
          ? lessParse(text)
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
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

function getDisabledLines(text: string): Set<number> {
  const disabled = new Set<number>();
  const lines = text.split(/\r?\n/);
  let block = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/\/\*\s*design-lint-disable\s*\*\//.test(line)) {
      block = true;
      continue;
    }
    if (/\/\*\s*design-lint-enable\s*\*\//.test(line)) {
      block = false;
      continue;
    }
    if (/(?:\/\/|\/\*)\s*design-lint-disable-next-line/.test(line)) {
      disabled.add(i + 2);
      continue;
    }
    if (line.includes('design-lint-disable-line')) {
      disabled.add(i + 1);
      continue;
    }
    if (block) disabled.add(i + 1);
  }
  return disabled;
}
