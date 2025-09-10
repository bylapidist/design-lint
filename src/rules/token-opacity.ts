import ts from 'typescript';
import valueParser from 'postcss-value-parser';
import type { RuleModule, LegacyRuleContext } from '../core/types.js';
import { isStyleValue } from '../utils/style.js';

export const opacityRule: RuleModule<unknown, LegacyRuleContext> = {
  name: 'design-token/opacity',
  meta: { description: 'enforce opacity tokens', category: 'design-token' },
  create(context) {
    const opacityTokens = context.getFlattenedTokens('number');
    const allowed = new Set(
      opacityTokens
        .filter(
          ({ path, token }) =>
            path.startsWith('opacity.') && typeof token.$value === 'number',
        )
        .map(({ token }) => token.$value as number),
    );
    if (allowed.size === 0) {
      context.report({
        message:
          'design-token/opacity requires opacity tokens; configure tokens with $type "number" under an "opacity" group to enable this rule.',
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
};
