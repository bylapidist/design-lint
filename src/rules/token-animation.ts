import valueParser from 'postcss-value-parser';
import type { RuleModule } from '../core/types.js';

export const animationRule: RuleModule = {
  name: 'design-token/animation',
  meta: { description: 'enforce animation tokens' },
  create(context) {
    const animationTokens = context.tokens?.animations;
    if (!animationTokens || Object.keys(animationTokens).length === 0) {
      context.report({
        message:
          'design-token/animation requires animation tokens; configure tokens.animations to enable this rule.',
        line: 1,
        column: 1,
      });
      return {};
    }
    const normalize = (val: string): string =>
      valueParser.stringify(valueParser(val).nodes).trim();
    const allowed = new Set(
      Object.values(animationTokens).map((v) => normalize(String(v))),
    );
    return {
      onCSSDeclaration(decl) {
        if (decl.prop === 'animation') {
          const norm = normalize(decl.value);
          if (!allowed.has(norm)) {
            context.report({
              message: `Unexpected animation ${decl.value}`,
              line: decl.line,
              column: decl.column,
            });
          }
        }
      },
    };
  },
};
