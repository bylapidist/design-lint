import valueParser from 'postcss-value-parser';
import colorString from 'color-string';
import colorName from 'color-name';
import type { RuleModule } from '../core/types.js';
import { matchToken, extractVarName } from '../utils/token-match.js';

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

export const borderColorRule: RuleModule = {
  name: 'design-token/border-color',
  meta: { description: 'enforce border-color tokens' },
  create(context) {
    const borderColorTokens = context.tokens?.borderColors;
    if (
      !borderColorTokens ||
      (Array.isArray(borderColorTokens)
        ? borderColorTokens.length === 0
        : Object.keys(borderColorTokens).length === 0)
    ) {
      context.report({
        message:
          'design-token/border-color requires border color tokens; configure tokens.borderColors to enable this rule.',
        line: 1,
        column: 1,
      });
      return {};
    }
    if (Array.isArray(borderColorTokens)) {
      return {
        onCSSDeclaration(decl) {
          if (/^border(-(top|right|bottom|left))?-color$/.test(decl.prop)) {
            const name = extractVarName(decl.value);
            if (!name || !matchToken(name, borderColorTokens)) {
              context.report({
                message: `Unexpected border color ${decl.value}`,
                line: decl.line,
                column: decl.column,
              });
            }
          }
        },
      };
    }
    const allowed = new Set(
      Object.values(borderColorTokens).map((v) => String(v).toLowerCase()),
    );
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
};
