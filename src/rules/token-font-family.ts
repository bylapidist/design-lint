import { rules, tokens } from '../utils/index.js';

const { tokenRule } = rules;
const { getPathRoot } = tokens;

export const fontFamilyRule = tokenRule({
  name: 'design-token/font-family',
  meta: { description: 'enforce font-family tokens', category: 'design-token' },
  tokens: 'fontFamily',
  message:
    'design-token/font-family requires font tokens; configure tokens with $type "fontFamily" under a "fonts" group to enable this rule.',
  getAllowed(tokens) {
    const fonts = new Set<string>();
    for (const { path, value } of tokens) {
      if (getPathRoot(path) !== 'fonts') continue;
      const val = value;
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
