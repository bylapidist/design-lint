import ts from 'typescript';
import type { DtifFlattenedToken } from '../core/types.js';
import { rules, guards } from '../utils/index.js';

const { tokenRule } = rules;
const {
  ast: { isStyleValue },
  domain: { isTokenInGroup },
} = guards;

export const fontWeightRule = tokenRule({
  name: 'design-token/font-weight',
  meta: { description: 'enforce font-weight tokens', category: 'design-token' },
  tokens: 'fontWeight',
  message:
    'design-token/font-weight requires font weight tokens; configure tokens with $type "fontWeight" under a "fontWeights" group to enable this rule.',
  getAllowed(_context, dtifTokens: readonly DtifFlattenedToken[] = []) {
    const numeric = new Set<number>();
    const values = new Set<string>();
    for (const token of dtifTokens) {
      if (!isTokenInGroup(token, 'fontWeights')) continue;
      const val = token.value;
      if (typeof val === 'number') {
        numeric.add(val);
        values.add(String(val));
      } else if (typeof val === 'string') {
        const trimmed = val.trim();
        values.add(trimmed);
        const num = Number(trimmed);
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
