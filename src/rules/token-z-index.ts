import ts from 'typescript';
import { rules, guards } from '../utils/index.js';

const { tokenRule } = rules;
const {
  ast: { isStyleValue },
} = guards;

export const zIndexRule = tokenRule({
  name: 'design-token/z-index',
  meta: { description: 'enforce z-index tokens', category: 'design-token' },
  tokens: 'number',
  message:
    'design-token/z-index requires z-index tokens; configure tokens with $type "number" under a "zIndex" group to enable this rule.',
  getAllowed(tokens) {
    const allowed = new Set<number>();
    for (const { path, token } of tokens) {
      if (!path.startsWith('zIndex.')) continue;
      const val = token.$value;
      if (typeof val === 'number') allowed.add(val);
    }
    return allowed;
  },
  create(context, allowed) {
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
});
