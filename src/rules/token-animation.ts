import valueParser from 'postcss-value-parser';
import type { RuleModule } from '../core/types.js';

export const animationRule: RuleModule = {
  name: 'design-token/animation',
  meta: { description: 'enforce animation tokens', category: 'design-token' },
  create(context) {
    const animationTokens = context.getFlattenedTokens('string');
    const normalize = (val: string): string =>
      valueParser.stringify(valueParser(val).nodes).trim();
    const allowed = new Set<string>();
    for (const { path, token } of animationTokens) {
      if (!path.startsWith('animations.')) continue;
      const val = token.$value;
      if (typeof val === 'string') {
        allowed.add(normalize(val));
      }
    }
    if (allowed.size === 0) {
      context.report({
        message:
          'design-token/animation requires animation tokens; configure tokens with $type "string" under an "animations" group to enable this rule.',
        line: 1,
        column: 1,
      });
      return {};
    }
    return {
      onCSSDeclaration(decl) {
        if (decl.prop === 'animation') {
          if (decl.value.includes('var(')) return;
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
