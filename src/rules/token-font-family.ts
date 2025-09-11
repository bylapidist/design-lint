import type { RuleModule } from '../core/types.js';

export const fontFamilyRule: RuleModule = {
  name: 'design-token/font-family',
  meta: { description: 'enforce font-family tokens', category: 'design-token' },
  create(context) {
    const fontFamilies = context.getFlattenedTokens('fontFamily');
    const fonts = new Set<string>();
    for (const { path, token } of fontFamilies) {
      if (!path.startsWith('fonts.')) continue;
      const val = token.$value;
      if (typeof val === 'string') fonts.add(val);
    }
    if (fonts.size === 0) {
      context.report({
        message:
          'design-token/font-family requires font tokens; configure tokens with $type "fontFamily" under a "fonts" group to enable this rule.',
        line: 1,
        column: 1,
      });
      return {};
    }
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
