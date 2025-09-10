import type { RuleModule, LegacyRuleContext } from '../core/types.js';

export const fontSizeRule: RuleModule<unknown, LegacyRuleContext> = {
  name: 'design-token/font-size',
  meta: { description: 'enforce font-size tokens', category: 'design-token' },
  create(context) {
    const fontSizes = context.getFlattenedTokens('dimension');
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
    const sizes = new Set<number>();
    for (const { path, token } of fontSizes) {
      if (!path.startsWith('fontSizes.')) continue;
      const num = parseSize(token.$value);
      if (num !== null) sizes.add(num);
    }
    if (sizes.size === 0) {
      context.report({
        message:
          'design-token/font-size requires font size tokens; configure tokens with $type "dimension" under a "fontSizes" group to enable this rule.',
        line: 1,
        column: 1,
      });
      return {};
    }
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
