import valueParser from 'postcss-value-parser';
import type { RuleModule } from '../core/types.js';
import {
  matchToken,
  extractVarName,
  closestToken,
} from '../core/token-utils.js';

export const animationRule: RuleModule = {
  name: 'design-token/animation',
  meta: { description: 'enforce animation tokens', category: 'design-token' },
  create(context) {
    const animationTokens = context.tokens.animations;
    if (
      !animationTokens ||
      (Array.isArray(animationTokens)
        ? animationTokens.length === 0
        : Object.keys(animationTokens).length === 0)
    ) {
      context.report({
        message:
          'design-token/animation requires animation tokens; configure tokens.animations to enable this rule.',
        line: 1,
        column: 1,
      });
      return {};
    }
    if (Array.isArray(animationTokens)) {
      return {
        onCSSDeclaration(decl) {
          if (decl.prop === 'animation') {
            const name = extractVarName(decl.value);
            if (!name || !matchToken(name, animationTokens)) {
              const suggest = name ? closestToken(name, animationTokens) : null;
              context.report({
                message: `Unexpected animation ${decl.value}`,
                line: decl.line,
                column: decl.column,
                suggest: suggest ?? undefined,
              });
            }
          }
        },
      };
    }
    const normalize = (val: string): string =>
      valueParser.stringify(valueParser(val).nodes).trim();
    const allowed = new Set(
      Object.values(animationTokens).map((v) => normalize(v)),
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
