import type { RuleModule } from '../core/types.js';

export const fontFamilyRule: RuleModule = {
  name: 'design-token/font-family',
  meta: { description: 'enforce font-family tokens' },
  create(context) {
    const fontFamilies = context.tokens?.fonts;
    if (!fontFamilies || Object.keys(fontFamilies).length === 0) {
      context.report({
        message:
          'design-token/font-family requires fonts tokens; configure tokens.fonts to enable this rule.',
        line: 1,
        column: 1,
      });
      return {};
    }
    const fonts = new Set(Object.values(fontFamilies));
    return {
      onCSSDeclaration(decl) {
        if (decl.prop === 'font-family') {
          const families = decl.value
            .split(',')
            .map((f) => f.trim().replace(/^['"]|['"]$/g, ''));
          for (const fam of families) {
            if (!fonts.has(fam)) {
              context.report({
                message: `Unexpected font family ${fam}`,
                line: decl.line,
                column: decl.column,
              });
              break;
            }
          }
        }
      },
    };
  },
};
