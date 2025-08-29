import ts from 'typescript';
import type { RuleModule } from '../core/types.js';

export const zIndexRule: RuleModule = {
  name: 'design-token/z-index',
  meta: { description: 'enforce z-index tokens' },
  create(context) {
    const zTokens = context.tokens?.zIndex;
    if (!zTokens || Object.keys(zTokens).length === 0) {
      context.report({
        message:
          'design-token/z-index requires zIndex tokens; configure tokens.zIndex to enable this rule.',
        line: 1,
        column: 1,
      });
      return {};
    }
    const allowed = new Set<number>(
      Object.values(zTokens)
        .map((v) => Number(v))
        .filter((n) => !isNaN(n)),
    );
    return {
      onNode(node) {
        if (ts.isNumericLiteral(node)) {
          const value = Number(node.text);
          if (!allowed.has(value)) {
            const pos = node
              .getSourceFile()
              .getLineAndCharacterOfPosition(node.getStart());
            context.report({
              message: `Unexpected z-index ${value}`,
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
