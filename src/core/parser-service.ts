import ts from 'typescript';
import postcss from 'postcss';
import postcssScss from 'postcss-scss';
import postcssLess from 'postcss-less';
import type { parse as svelteParse } from 'svelte/compiler';
import type {
  RuleModule,
  RuleContext,
  LintMessage,
  CSSDeclaration,
  DesignTokens,
} from './types.js';
import { mergeTokens } from './token-loader.js';

export interface EnabledRule {
  rule: RuleModule;
  options: unknown;
  severity: 'error' | 'warn';
}

export class ParserService {
  constructor(private tokensByTheme: Record<string, DesignTokens>) {}

  async parse(
    text: string,
    filePath: string,
    enabled: EnabledRule[],
  ): Promise<{
    messages: LintMessage[];
    ruleDescriptions: Record<string, string>;
  }> {
    const messages: LintMessage[] = [];
    const ruleDescriptions: Record<string, string> = {};
    const disabledLines = getDisabledLines(text);
    const listeners = enabled.map(({ rule, options, severity }) => {
      ruleDescriptions[rule.name] = rule.meta.description;
      const themes =
        options &&
        typeof options === 'object' &&
        options !== null &&
        Array.isArray((options as { themes?: unknown }).themes)
          ? ((options as { themes?: string[] }).themes as string[])
          : undefined;
      const tokens = mergeTokens(this.tokensByTheme, themes);
      const ctx: RuleContext = {
        filePath,
        tokens: tokens as DesignTokens,
        options,
        report: (m) =>
          messages.push({ ...m, severity, ruleId: rule.name } as LintMessage),
      };
      return rule.create(ctx);
    });

    if (/\.vue$/.test(filePath)) {
      try {
        const { parse } = await import('@vue/compiler-sfc');
        const { descriptor } = parse(text, { filename: filePath });
        const template = descriptor.template?.content ?? '';
        const templateTsx = template
          .replace(/class=/g, 'className=')
          .replace(
            /:style="{([^}]+)}"/g,
            (_, expr) => `style={{ ${expr.trim()} }}`,
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
          const decls = parseCSS(
            style.content,
            messages,
            style.lang as string | undefined,
          );
          for (const decl of decls) {
            for (const l of listeners) l.onCSSDeclaration?.(decl);
          }
        }
      } catch (e: unknown) {
        const err = e as { line?: number; column?: number; message?: string };
        messages.push({
          ruleId: 'parse-error',
          message: err.message || 'Failed to parse Vue component',
          severity: 'error',
          line: typeof err.line === 'number' ? err.line : 1,
          column: typeof err.column === 'number' ? err.column : 1,
        });
      }
    } else if (/\.svelte$/.test(filePath)) {
      try {
        const { parse } = (await import('svelte/compiler')) as {
          parse: typeof svelteParse;
        };
        const ast = parse(text);
        const scripts: string[] = [];
        if (ast.instance)
          scripts.push(
            text.slice(ast.instance.content.start, ast.instance.content.end),
          );
        if (ast.module)
          scripts.push(
            text.slice(ast.module.content.start, ast.module.content.end),
          );

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
          value: Array<{
            type: string;
            data?: string;
            expression?: { start: number; end: number };
          }>;
        }): CSSDeclaration[] => {
          const exprs: string[] = [];
          let content = '';
          for (const part of attr.value) {
            if (part.type === 'Text') content += part.data ?? '';
            else if (part.type === 'MustacheTag') {
              const i = exprs.length;
              exprs.push(
                text.slice(part.expression!.start, part.expression!.end),
              );
              content += `__EXPR_${i}__`;
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
          const n = node as { attributes?: unknown[]; children?: unknown[] };
          if (!n) return;
          for (const attrRaw of n.attributes ?? []) {
            const attr = attrRaw as {
              type: string;
              name: string;
              start: number;
              end: number;
              value: Array<{
                type: string;
                data?: string;
                expression?: { start: number; end: number };
              }>;
            };
            if (attr.type === 'Attribute' && attr.name === 'style') {
              styleDecls.push(...extractStyleAttribute(attr));
              replacements.push({
                start: attr.start,
                end: attr.end,
                text: 'style={{}}',
              });
            } else if (attr.type === 'StyleDirective') {
              const value = attr.value
                .map((v) =>
                  v.type === 'Text'
                    ? v.data
                    : text.slice(v.expression!.start, v.expression!.end),
                )
                .join('')
                .trim();
              const { line, column } = getLineAndColumn(attr.start);
              styleDecls.push({ prop: attr.name, value, line, column });
              replacements.push({ start: attr.start, end: attr.end, text: '' });
            }
          }
          for (const child of n.children ?? []) walk(child);
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
          const styleText = text.slice(
            ast.css.content.start,
            ast.css.content.end,
          );
          const langAttr = (
            ast.css as unknown as {
              attributes?: Array<{
                name: string;
                value?: Array<{ data?: string }>;
              }>;
            }
          ).attributes?.find((a) => a.name === 'lang');
          const lang = langAttr?.value?.[0]?.data;
          const decls = parseCSS(styleText, messages, lang);
          for (const decl of decls) {
            for (const l of listeners) l.onCSSDeclaration?.(decl);
          }
        }
      } catch (e: unknown) {
        const err = e as { line?: number; column?: number; message?: string };
        messages.push({
          ruleId: 'parse-error',
          message: err.message || 'Failed to parse Svelte component',
          severity: 'error',
          line: typeof err.line === 'number' ? err.line : 1,
          column: typeof err.column === 'number' ? err.column : 1,
        });
      }
    } else if (/\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/.test(filePath)) {
      const source = ts.createSourceFile(
        filePath,
        text,
        ts.ScriptTarget.Latest,
        true,
      );
      const getRootTag = (expr: ts.LeftHandSideExpression): string | null => {
        if (ts.isIdentifier(expr)) return expr.text;
        if (
          ts.isPropertyAccessExpression(expr) ||
          ts.isElementAccessExpression(expr)
        ) {
          return getRootTag(expr.expression as ts.LeftHandSideExpression);
        }
        if (ts.isCallExpression(expr)) {
          return getRootTag(expr.expression as ts.LeftHandSideExpression);
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
            const column =
              m.line === 1 ? start.character + m.column - 1 : m.column;
            messages.push({ ...m, line, column });
          }
          return;
        } else if (ts.isTaggedTemplateExpression(node)) {
          const root = getRootTag(node.tag as ts.LeftHandSideExpression);
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
                decl.line === 1
                  ? start.character + decl.column - 1
                  : decl.column;
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
    } else if (/\.(?:css|scss|sass|less)$/.test(filePath)) {
      let syntax: string | undefined;
      if (/\.s[ac]ss$/i.test(filePath)) syntax = 'scss';
      else if (/\.less$/i.test(filePath)) syntax = 'less';
      const decls = parseCSS(text, messages, syntax);
      for (const decl of decls) {
        for (const l of listeners) l.onCSSDeclaration?.(decl);
      }
    }
    const filtered = messages.filter((m) => !disabledLines.has(m.line));
    return { messages: filtered, ruleDescriptions };
  }
}

function parseCSS(
  text: string,
  messages: LintMessage[] = [],
  lang?: string,
): CSSDeclaration[] {
  const decls: CSSDeclaration[] = [];
  try {
    const root: postcss.Root =
      lang === 'scss' || lang === 'sass'
        ? postcssScss.parse(text)
        : lang === 'less'
          ? postcssLess.parse(text)
          : postcss.parse(text);
    root.walkDecls((d) => {
      decls.push({
        prop: d.prop,
        value: d.value,
        line: d.source?.start?.line || 1,
        column: d.source?.start?.column || 1,
      });
    });
  } catch (e: unknown) {
    const err = e as { line?: number; column?: number; message?: string };
    messages.push({
      ruleId: 'parse-error',
      message: err.message || 'Failed to parse CSS',
      severity: 'error',
      line: typeof err.line === 'number' ? err.line : 1,
      column: typeof err.column === 'number' ? err.column : 1,
    });
  }
  return decls;
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
    if (/design-lint-disable-line/.test(line)) {
      disabled.add(i + 1);
      continue;
    }
    if (block) disabled.add(i + 1);
  }
  return disabled;
}
