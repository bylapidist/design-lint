import ts from 'typescript';
import type { RuleModule } from '../core/types';

export const spacingRule: RuleModule = {
  name: 'design-token/spacing',
  meta: { description: 'enforce spacing scale' },
  create(context) {
    const allowed = new Set(Object.values(context.tokens?.spacing || {}));
    return {
      onNode(node) {
        if (ts.isNumericLiteral(node)) {
          const value = Number(node.text);
          if (!allowed.has(value)) {
            const pos = node
              .getSourceFile()
              .getLineAndCharacterOfPosition(node.getStart());
            context.report({
              message: `Unexpected spacing ${value}`,
              line: pos.line + 1,
              column: pos.character + 1,
            });
          }
        }
      },
      onCSSDeclaration(decl) {
        const num = parseInt(decl.value, 10);
        if (!isNaN(num) && !allowed.has(num)) {
          context.report({
            message: `Unexpected spacing ${decl.value}`,
            line: decl.source?.start?.line || 0,
            column: decl.source?.start?.column || 0,
          });
        }
      },
    };
  },
};
