import type { RuleModule } from '../core/types.js';
import { matchToken, extractVarName } from '../utils/token-match.js';

export const fontFamilyRule: RuleModule = {
  name: 'design-token/font-family',
  meta: { description: 'enforce font-family tokens' },
  create(context) {
    const fontFamilies = context.tokens?.fonts;
    if (
      !fontFamilies ||
      (Array.isArray(fontFamilies)
        ? fontFamilies.length === 0
        : Object.keys(fontFamilies).length === 0)
    ) {
      context.report({
        message:
          'design-token/font-family requires fonts tokens; configure tokens.fonts to enable this rule.',
        line: 1,
        column: 1,
      });
      return {};
    }
    if (Array.isArray(fontFamilies)) {
      return {
        onCSSDeclaration(decl) {
          if (decl.prop === 'font-family') {
            const name = extractVarName(decl.value);
            if (!name || !matchToken(name, fontFamilies)) {
              context.report({
                message: `Unexpected font family ${decl.value}`,
                line: decl.line,
                column: decl.column,
              });
            }
          }
        },
      };
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
