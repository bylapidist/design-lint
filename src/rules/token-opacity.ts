import ts from 'typescript';
import valueParser from 'postcss-value-parser';
import { tokenRule } from './utils/token-rule.js';
import { isStyleValue } from '../utils/style.js';

export const opacityRule = tokenRule({
  name: 'design-token/opacity',
  meta: { description: 'enforce opacity tokens', category: 'design-token' },
  tokens: 'number',
  message:
    'design-token/opacity requires opacity tokens; configure tokens with $type "number" under an "opacity" group to enable this rule.',
  getAllowed(tokens) {
    const allowed = new Set<number>();
    for (const { path, token } of tokens) {
      if (!path.startsWith('opacity.')) continue;
      if (typeof token.$value === 'number') {
        allowed.add(token.$value);
      }
    }
    return allowed;
  },
  create(context, allowed) {
    return {
      onNode(node) {
        if (!isStyleValue(node)) return;
        if (ts.isNumericLiteral(node)) {
          const value = Number(node.text);
          if (!Number.isNaN(value) && !allowed.has(value)) {
            const pos = node
              .getSourceFile()
              .getLineAndCharacterOfPosition(node.getStart());
            context.report({
              message: `Unexpected opacity ${String(value)}`,
              line: pos.line + 1,
              column: pos.character + 1,
            });
          }
        }
      },
      onCSSDeclaration(decl) {
        if (decl.prop === 'opacity') {
          const parsed = valueParser.unit(decl.value);
          const num = Number(parsed ? parsed.number : decl.value);
          if (!Number.isNaN(num) && !allowed.has(num)) {
            context.report({
              message: `Unexpected opacity ${decl.value}`,
              line: decl.line,
              column: decl.column,
            });
          }
        }
      },
    };
  },
});
