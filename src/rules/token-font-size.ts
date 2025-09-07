import type { RuleModule } from '../core/types.js';
import {
  matchToken,
  extractVarName,
  closestToken,
} from '../utils/token-match.js';

export const fontSizeRule: RuleModule = {
  name: 'design-token/font-size',
  meta: { description: 'enforce font-size tokens' },
  create(context) {
    const fontSizes = context.tokens.fontSizes;
    if (
      !fontSizes ||
      (Array.isArray(fontSizes)
        ? fontSizes.length === 0
        : Object.keys(fontSizes).length === 0)
    ) {
      context.report({
        message:
          'design-token/font-size requires fontSizes tokens; configure tokens.fontSizes to enable this rule.',
        line: 1,
        column: 1,
      });
      return {};
    }
    if (Array.isArray(fontSizes)) {
      return {
        onCSSDeclaration(decl) {
          if (decl.prop === 'font-size') {
            const name = extractVarName(decl.value);
            if (!name || !matchToken(name, fontSizes)) {
              const suggest = name ? closestToken(name, fontSizes) : null;
              context.report({
                message: `Unexpected font size ${decl.value}`,
                line: decl.line,
                column: decl.column,
                suggest: suggest ?? undefined,
              });
            }
          }
        },
      };
    }
    const parseSize = (val: unknown): number | null => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const match = /^(\d*\.?\d+)(px|rem|em)$/.exec(val.trim());
        if (match) {
          const [, num, unit] = match;
          const n = parseFloat(num);
          const factor = unit === 'px' ? 1 : 16;
          return n * factor;
        }
      }
      return null;
    };
    const sizes = new Set(
      Object.values(fontSizes)
        .map((s) => parseSize(s))
        .filter((s): s is number => s !== null),
    );
    return {
      onCSSDeclaration(decl) {
        if (decl.prop === 'font-size') {
          const num = parseSize(decl.value);
          if (num !== null && !sizes.has(num)) {
            context.report({
              message: `Unexpected font size ${decl.value}`,
              line: decl.line,
              column: decl.column,
            });
          }
        }
      },
    };
  },
};
