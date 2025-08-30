import valueParser from 'postcss-value-parser';
import type { RuleModule } from '../core/types.js';

export const outlineRule: RuleModule = {
  name: 'design-token/outline',
  meta: { description: 'enforce outline tokens' },
  create(context) {
    const outlineTokens = context.tokens?.outlines;
    if (!outlineTokens || Object.keys(outlineTokens).length === 0) {
      context.report({
        message:
          'design-token/outline requires outline tokens; configure tokens.outlines to enable this rule.',
        line: 1,
        column: 1,
      });
      return {};
    }
    const normalize = (val: string): string =>
      valueParser.stringify(valueParser(val).nodes).trim();
    const allowed = new Set(
      Object.values(outlineTokens).map((v) => normalize(String(v))),
    );
    return {
      onCSSDeclaration(decl) {
        if (decl.prop === 'outline') {
          const norm = normalize(decl.value);
          if (!allowed.has(norm)) {
            context.report({
              message: `Unexpected outline ${decl.value}`,
              line: decl.line,
              column: decl.column,
            });
          }
        }
      },
    };
  },
};
