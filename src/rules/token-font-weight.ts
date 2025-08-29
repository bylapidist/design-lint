import ts from 'typescript';
import type { RuleModule } from '../core/types.js';

export const fontWeightRule: RuleModule = {
  name: 'design-token/font-weight',
  meta: { description: 'enforce font-weight tokens' },
  create(context) {
    const fontWeights = context.tokens?.typography?.fontWeights;
    if (!fontWeights || Object.keys(fontWeights).length === 0) {
      context.report({
        message:
          'design-token/font-weight requires typography.fontWeights tokens; configure tokens.typography.fontWeights to enable this rule.',
        line: 1,
        column: 1,
      });
      return {};
    }
    const numeric = new Set<number>();
    const values = new Set<string>();
    for (const val of Object.values(fontWeights)) {
      const str = String(val).trim();
      values.add(str);
      const num = Number(str);
      if (!isNaN(num)) numeric.add(num);
    }
    return {
      onNode(node) {
        if (ts.isNumericLiteral(node)) {
          const value = Number(node.text);
          if (!numeric.has(value)) {
            const pos = node
              .getSourceFile()
              .getLineAndCharacterOfPosition(node.getStart());
            context.report({
              message: `Unexpected font weight ${value}`,
              line: pos.line + 1,
              column: pos.character + 1,
            });
          }
        }
      },
      onCSSDeclaration(decl) {
        if (decl.prop === 'font-weight') {
          const val = decl.value.trim();
          const num = Number(val);
          if (!isNaN(num)) {
            if (!numeric.has(num)) {
              context.report({
                message: `Unexpected font weight ${decl.value}`,
                line: decl.line,
                column: decl.column,
              });
            }
          } else if (!values.has(val)) {
            context.report({
              message: `Unexpected font weight ${decl.value}`,
              line: decl.line,
              column: decl.column,
            });
          }
        }
      },
    };
  },
};
