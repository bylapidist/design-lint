import ts from 'typescript';
import valueParser from 'postcss-value-parser';
import colorString from 'color-string';
import colorName from 'color-name';
import { tokenRule } from './utils/token-rule.js';
import { isStyleValue } from '../utils/style.js';

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

export const colorsRule = tokenRule<ColorRuleOptions>({
  name: 'design-token/colors',
  meta: { description: 'disallow raw colors', category: 'design-token' },
  tokens: 'color',
  message:
    'design-token/colors requires color tokens; configure tokens with $type "color" to enable this rule.',
  getAllowed(tokens) {
    return new Set(
      tokens
        .map(({ token }) => {
          const v = token.$value;
          return typeof v === 'string' && !v.startsWith('{')
            ? v.toLowerCase()
            : null;
        })
        .filter((v): v is string => v !== null),
    );
  },
  create(context, allowed) {
    const opts = context.options ?? {};
    const allowFormats = new Set(opts.allow ?? []);
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
        if (!isStyleValue(node)) return;
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
});
