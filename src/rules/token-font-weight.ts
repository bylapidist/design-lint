import ts from 'typescript';
import type { RuleModule, LegacyRuleContext } from '../core/types.js';
import { isStyleValue } from '../utils/style.js';

export const fontWeightRule: RuleModule<unknown, LegacyRuleContext> = {
  name: 'design-token/font-weight',
  meta: { description: 'enforce font-weight tokens', category: 'design-token' },
  create(context) {
    const fontWeights = context.getFlattenedTokens('fontWeight');
    const numeric = new Set<number>();
    const values = new Set<string>();
    for (const { path, token } of fontWeights) {
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
    if (values.size === 0) {
      context.report({
        message:
          'design-token/font-weight requires font weight tokens; configure tokens with $type "fontWeight" under a "fontWeights" group to enable this rule.',
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
};
