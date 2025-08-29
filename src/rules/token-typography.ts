import type { RuleModule } from '../core/types';

export const typographyRule: RuleModule = {
  name: 'design-token/typography',
  meta: { description: 'enforce typography tokens' },
  create(context) {
    const typo = context.tokens?.typography;
    const fontSizes = typo?.fontSizes;
    const fontFamilies = typo?.fonts;
    if (
      !fontSizes ||
      !fontFamilies ||
      Object.keys(fontSizes).length === 0 ||
      Object.keys(fontFamilies).length === 0
    ) {
      const missing: string[] = [];
      if (!fontSizes || Object.keys(fontSizes).length === 0)
        missing.push('typography.fontSizes');
      if (!fontFamilies || Object.keys(fontFamilies).length === 0)
        missing.push('typography.fonts');
      context.report({
        message: `design-token/typography requires ${missing.join(' and ')}; configure these tokens to enable this rule.`,
        line: 1,
        column: 1,
      });
      return {};
    }
    const sizes = new Set(Object.values(fontSizes));
    const fonts = new Set(Object.values(fontFamilies));
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
