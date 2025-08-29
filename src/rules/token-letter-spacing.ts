import ts from 'typescript';
import type { RuleModule } from '../core/types.js';

export const letterSpacingRule: RuleModule = {
  name: 'design-token/letter-spacing',
  meta: { description: 'enforce letter-spacing tokens' },
  create(context) {
    const letterSpacings = context.tokens?.typography?.letterSpacings;
    if (!letterSpacings || Object.keys(letterSpacings).length === 0) {
      context.report({
        message:
          'design-token/letter-spacing requires typography.letterSpacings tokens; configure tokens.typography.letterSpacings to enable this rule.',
        line: 1,
        column: 1,
      });
      return {};
    }
    const parse = (val: unknown): number | null => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const v = val.trim();
        const unitMatch = v.match(/^(-?\d*\.?\d+)(px|rem|em)$/);
        if (unitMatch) {
          const [, num, unit] = unitMatch;
          const n = parseFloat(num);
          const factor = unit === 'px' ? 1 : 16;
          return n * factor;
        }
      }
      return null;
    };
    const numeric = new Set<number>();
    const values = new Set<string>();
    for (const val of Object.values(letterSpacings)) {
      const str = String(val).trim();
      values.add(str);
      const num = parse(val);
      if (num !== null) numeric.add(num);
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
              message: `Unexpected letter spacing ${value}`,
              line: pos.line + 1,
              column: pos.character + 1,
            });
          }
        }
      },
      onCSSDeclaration(decl) {
        if (decl.prop === 'letter-spacing') {
          const val = decl.value.trim();
          const num = parse(val);
          if (num !== null) {
            if (!numeric.has(num)) {
              context.report({
                message: `Unexpected letter spacing ${decl.value}`,
                line: decl.line,
                column: decl.column,
              });
            }
          } else if (!values.has(val)) {
            context.report({
              message: `Unexpected letter spacing ${decl.value}`,
              line: decl.line,
              column: decl.column,
            });
          }
        }
      },
    };
  },
};
