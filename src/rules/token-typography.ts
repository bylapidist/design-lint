import type { RuleModule } from '../core/types';

export const typographyRule: RuleModule = {
  name: 'design-token/typography',
  meta: { description: 'enforce typography tokens' },
  create(context) {
    const sizes = new Set(
      Object.values(context.tokens?.typography?.fontSizes || {}),
    );
    const fonts = new Set(
      Object.values(context.tokens?.typography?.fonts || {}),
    );
    return {
      onCSSDeclaration(decl) {
        if (decl.prop === 'font-size') {
          const num = parseInt(decl.value, 10);
          if (!isNaN(num) && !sizes.has(num)) {
            context.report({
              message: `Unexpected font size ${decl.value}`,
              line: decl.line,
              column: decl.column,
            });
          }
        }
        if (decl.prop === 'font-family') {
          if (!fonts.has(decl.value)) {
            context.report({
              message: `Unexpected font family ${decl.value}`,
              line: decl.line,
              column: decl.column,
            });
          }
        }
      },
    };
  },
};
