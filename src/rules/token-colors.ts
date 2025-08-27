import ts from 'typescript';
import type { RuleModule } from '../core/types';

const colorRegex = /#([0-9a-fA-F]{3,8})/;

export const colorsRule: RuleModule = {
  name: 'design-token/colors',
  meta: { description: 'disallow raw colors' },
  create(context) {
    const allowed = new Set(Object.values(context.tokens?.colors || {}));
    return {
      onNode(node) {
        if (ts.isStringLiteral(node) && colorRegex.test(node.text)) {
          const value = node.text;
          if (!allowed.has(value)) {
            const pos = node
              .getSourceFile()
              .getLineAndCharacterOfPosition(node.getStart());
            context.report({
              message: `Unexpected color ${value}`,
              line: pos.line + 1,
              column: pos.character + 1,
            });
          }
        }
      },
      onCSSDeclaration(decl) {
        const match = decl.value.match(colorRegex);
        if (match) {
          const value = match[0];
          if (!allowed.has(value)) {
            context.report({
              message: `Unexpected color ${value}`,
              line: decl.line,
              column: decl.column,
            });
          }
        }
      },
    };
  },
};
