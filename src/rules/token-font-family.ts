import type { DtifFlattenedToken } from '../core/types.js';
import { rules, guards } from '../utils/index.js';

const { tokenRule } = rules;
const {
  domain: { isTokenInGroup },
} = guards;

export const fontFamilyRule = tokenRule({
  name: 'design-token/font-family',
  meta: { description: 'enforce font-family tokens', category: 'design-token' },
  tokens: 'fontFamily',
  message:
    'design-token/font-family requires font tokens; configure tokens with $type "fontFamily" under a "fonts" group to enable this rule.',
  getAllowed(_context, dtifTokens: readonly DtifFlattenedToken[] = []) {
    const fonts = new Set<string>();
    for (const token of dtifTokens) {
      if (!isTokenInGroup(token, 'fonts')) continue;
      const val = token.value;
      if (typeof val === 'string') fonts.add(val);
    }
    return fonts;
  },
  create(context, fonts) {
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
});
