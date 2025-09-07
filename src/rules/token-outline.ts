import valueParser from 'postcss-value-parser';
import type { RuleModule } from '../core/types.js';
import {
  matchToken,
  extractVarName,
  closestToken,
} from '../utils/token-match.js';

export const outlineRule: RuleModule = {
  name: 'design-token/outline',
  meta: { description: 'enforce outline tokens' },
  create(context) {
    const outlineTokens = context.tokens.outlines;
    if (
      !outlineTokens ||
      (Array.isArray(outlineTokens)
        ? outlineTokens.length === 0
        : Object.keys(outlineTokens).length === 0)
    ) {
      context.report({
        message:
          'design-token/outline requires outline tokens; configure tokens.outlines to enable this rule.',
        line: 1,
        column: 1,
      });
      return {};
    }
    if (Array.isArray(outlineTokens)) {
      return {
        onCSSDeclaration(decl) {
          if (decl.prop === 'outline') {
            const name = extractVarName(decl.value);
            if (!name || !matchToken(name, outlineTokens)) {
              const suggest = name ? closestToken(name, outlineTokens) : null;
              context.report({
                message: `Unexpected outline ${decl.value}`,
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
      Object.values(outlineTokens).map((v) => normalize(v)),
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
