import ts from 'typescript';
import valueParser from 'postcss-value-parser';
import colorString from 'color-string';
import colorName from 'color-name';
import type { RuleModule } from '../core/types.js';
import {
  matchToken,
  extractVarName,
  closestToken,
} from '../utils/token-match.js';
import { isInNonStyleJsx } from '../utils/jsx.js';

type ColorFormat =
  | 'hex'
  | 'rgb'
  | 'rgba'
  | 'hsl'
  | 'hsla'
  | 'hwb'
  | 'lab'
  | 'lch'
  | 'color'
  | 'named';

const namedColors = new Set(Object.keys(colorName));

function detectFormat(value: string): ColorFormat | null {
  const v = value.toLowerCase();
  if (v.startsWith('#')) return 'hex';
  if (v.startsWith('rgba(')) return 'rgba';
  if (v.startsWith('rgb(')) return 'rgb';
  if (v.startsWith('hsla(')) return 'hsla';
  if (v.startsWith('hsl(')) return 'hsl';
  if (v.startsWith('hwb(')) return 'hwb';
  if (v.startsWith('lab(')) return 'lab';
  if (v.startsWith('lch(')) return 'lch';
  if (v.startsWith('color(')) return 'color';
  if (namedColors.has(v)) return 'named';
  return null;
}

interface ColorRuleOptions {
  allow?: ColorFormat[];
}

export const colorsRule: RuleModule = {
  name: 'design-token/colors',
  meta: { description: 'disallow raw colors' },
  create(context) {
    const colorTokens = context.tokens?.colors;
    if (
      !colorTokens ||
      (Array.isArray(colorTokens)
        ? colorTokens.length === 0
        : Object.keys(colorTokens).length === 0)
    ) {
      context.report({
        message:
          'design-token/colors requires color tokens; configure tokens.colors to enable this rule.',
        line: 1,
        column: 1,
      });
      return {};
    }
    if (Array.isArray(colorTokens)) {
      const checkVar = (value: string, line: number, column: number) => {
        const name = extractVarName(value);
        if (!name || !matchToken(name, colorTokens)) {
          const suggest = name ? closestToken(name, colorTokens) : null;
          context.report({
            message: `Unexpected color ${value}`,
            line,
            column,
            suggest: suggest ?? undefined,
          });
        }
      };
      return {
        onNode(node) {
          if (isInNonStyleJsx(node)) return;
          const sourceFile = node.getSourceFile();
          const handle = (text: string, n: ts.Node) => {
            const pos = sourceFile.getLineAndCharacterOfPosition(n.getStart());
            checkVar(text, pos.line + 1, pos.character + 1);
          };
          if (
            ts.isStringLiteral(node) ||
            ts.isNoSubstitutionTemplateLiteral(node)
          ) {
            handle(node.text, node);
          } else if (ts.isTemplateExpression(node)) {
            handle(node.head.text, node.head);
            for (const span of node.templateSpans) {
              handle(span.literal.text, span.literal);
            }
          }
        },
        onCSSDeclaration(decl) {
          checkVar(decl.value, decl.line, decl.column);
        },
      };
    }
    const allowed = new Set(
      Object.values(colorTokens).map((value) => value.toLowerCase()),
    );
    const opts = (context.options as ColorRuleOptions) || {};
    const allowFormats = new Set(opts.allow || []);
    const parserFormats = new Set<ColorFormat>([
      'hex',
      'rgb',
      'rgba',
      'hsl',
      'hsla',
      'hwb',
      'named',
    ]);

    const check = (text: string, line: number, column: number) => {
      const parsed = valueParser(text);
      parsed.walk((node) => {
        const value = valueParser.stringify(node);
        const format = detectFormat(value);
        if (!format || allowFormats.has(format)) return;
        if (parserFormats.has(format) && !colorString.get(value)) return;
        if (!allowed.has(value.toLowerCase())) {
          context.report({
            message: `Unexpected color ${value}`,
            line,
            column: column + node.sourceIndex,
          });
          return false;
        }
      });
    };

    return {
      onNode(node) {
        if (isInNonStyleJsx(node)) return;
        const sourceFile = node.getSourceFile();
        const handle = (text: string, n: ts.Node) => {
          const pos = sourceFile.getLineAndCharacterOfPosition(n.getStart());
          check(text, pos.line + 1, pos.character + 1);
        };
        if (
          ts.isStringLiteral(node) ||
          ts.isNoSubstitutionTemplateLiteral(node)
        ) {
          handle(node.text, node);
        } else if (ts.isTemplateExpression(node)) {
          handle(node.head.text, node.head);
          for (const span of node.templateSpans) {
            handle(span.literal.text, span.literal);
          }
        }
      },
      onCSSDeclaration(decl) {
        check(decl.value, decl.line, decl.column);
      },
    };
  },
};
