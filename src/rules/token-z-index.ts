import ts from 'typescript';
import type { RuleModule, LegacyRuleContext } from '../core/types.js';
import { isStyleValue } from '../utils/style.js';
export const zIndexRule: RuleModule<unknown, LegacyRuleContext> = {
  name: 'design-token/z-index',
  meta: { description: 'enforce z-index tokens', category: 'design-token' },
  create(context) {
    const zTokens = context.getFlattenedTokens('number');
    const allowed = new Set<number>();
    for (const { path, token } of zTokens) {
      if (!path.startsWith('zIndex.')) continue;
      const val = token.$value;
      const num = typeof val === 'number' ? val : Number(val);
      if (!Number.isNaN(num)) allowed.add(num);
    }
    if (allowed.size === 0) {
      context.report({
        message:
          'design-token/z-index requires z-index tokens; configure tokens with $type "number" under a "zIndex" group to enable this rule.',
        line: 1,
        column: 1,
      });
      return {};
    }
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
