import ts from 'typescript';
import type { RuleModule } from '../core/types.js';
import {
  matchToken,
  extractVarName,
  closestToken,
} from '../core/token-utils.js';
import { isStyleValue } from '../utils/style.js';

export const zIndexRule: RuleModule = {
  name: 'design-token/z-index',
  meta: { description: 'enforce z-index tokens', category: 'design-token' },
  create(context) {
    const zTokens = context.tokens.zIndex;
    if (
      !zTokens ||
      (Array.isArray(zTokens)
        ? zTokens.length === 0
        : Object.keys(zTokens).length === 0)
    ) {
      context.report({
        message:
          'design-token/z-index requires zIndex tokens; configure tokens.zIndex to enable this rule.',
        line: 1,
        column: 1,
      });
      return {};
    }
    if (Array.isArray(zTokens)) {
      return {
        onCSSDeclaration(decl) {
          if (decl.prop === 'z-index') {
            const name = extractVarName(decl.value);
            if (!name || !matchToken(name, zTokens)) {
              const suggest = name ? closestToken(name, zTokens) : null;
              context.report({
                message: `Unexpected z-index ${decl.value}`,
                line: decl.line,
                column: decl.column,
                suggest: suggest ?? undefined,
              });
            }
          }
        },
      };
    }
    const allowed = new Set<number>(
      Object.values(zTokens).filter((n) => !Number.isNaN(n)),
    );
    return {
      onNode(node) {
        if (!isStyleValue(node)) return;
        if (ts.isNumericLiteral(node)) {
          const value = Number(node.text);
          if (!allowed.has(value)) {
            const pos = node
              .getSourceFile()
              .getLineAndCharacterOfPosition(node.getStart());
            context.report({
              message: `Unexpected z-index ${String(value)}`,
              line: pos.line + 1,
              column: pos.character + 1,
            });
          }
        }
      },
      onCSSDeclaration(decl) {
        if (decl.prop === 'z-index') {
          const num = Number(decl.value.trim());
          if (!isNaN(num) && !allowed.has(num)) {
            context.report({
              message: `Unexpected z-index ${decl.value}`,
              line: decl.line,
              column: decl.column,
            });
          }
        }
      },
    };
  },
};
