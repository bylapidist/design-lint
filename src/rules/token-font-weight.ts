import ts from 'typescript';
import { tokenRule } from '../utils/token-rule';
import { isStyleValue } from '../utils/style';

export const fontWeightRule = tokenRule({
  name: 'design-token/font-weight',
  meta: { description: 'enforce font-weight tokens', category: 'design-token' },
  tokens: 'fontWeight',
  message:
    'design-token/font-weight requires font weight tokens; configure tokens with $type "fontWeight" under a "fontWeights" group to enable this rule.',
  getAllowed(tokens) {
    const numeric = new Set<number>();
    const values = new Set<string>();
    for (const { path, token } of tokens) {
      if (!path.startsWith('fontWeights.')) continue;
      const val = token.$value;
      if (typeof val === 'number') {
        numeric.add(val);
        values.add(String(val));
      } else if (typeof val === 'string') {
        values.add(val.trim());
        const num = Number(val);
        if (!isNaN(num)) numeric.add(num);
      }
    }
    return { numeric, values };
  },
  isEmpty(allowed) {
    return allowed.values.size === 0;
  },
  create(context, { numeric, values }) {
    return {
      onNode(node) {
        if (!isStyleValue(node)) return;
        if (ts.isNumericLiteral(node)) {
          const value = Number(node.text);
          if (!numeric.has(value)) {
            const pos = node
              .getSourceFile()
              .getLineAndCharacterOfPosition(node.getStart());
            context.report({
              message: `Unexpected font weight ${String(value)}`,
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
});
