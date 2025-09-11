import valueParser from 'postcss-value-parser';
import colorString from 'color-string';
import colorName from 'color-name';
import { tokenRule } from './utils/token-rule.js';

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

export const borderColorRule = tokenRule({
  name: 'design-token/border-color',
  meta: {
    description: 'enforce border-color tokens',
    category: 'design-token',
  },
  tokens: 'color',
  message:
    'design-token/border-color requires color tokens; configure tokens with $type "color" to enable this rule.',
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
    return {
      onCSSDeclaration(decl) {
        if (/^border(-(top|right|bottom|left))?-color$/.test(decl.prop)) {
          valueParser(decl.value).walk((node) => {
            const value = valueParser.stringify(node);
            const format = detectFormat(value);
            if (!format) return;
            if (format !== 'named' && !colorString.get(value)) return;
            if (!allowed.has(value.toLowerCase())) {
              context.report({
                message: `Unexpected border color ${value}`,
                line: decl.line,
                column: decl.column + node.sourceIndex,
              });
              return false;
            }
          });
        }
      },
    };
  },
});
