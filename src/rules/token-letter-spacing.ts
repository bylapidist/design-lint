import ts from 'typescript';
import type { RuleModule } from '../core/types.js';
import { isStyleValue } from '../utils/style.js';
import { isRecord } from '../utils/type-guards.js';

export const letterSpacingRule: RuleModule = {
  name: 'design-token/letter-spacing',
  meta: {
    description: 'enforce letter-spacing tokens',
    category: 'design-token',
  },
  create(context) {
    const letterSpacings = context.getFlattenedTokens('dimension');
    const parse = (val: unknown): number | null => {
      if (
        isRecord(val) &&
        typeof val.value === 'number' &&
        typeof val.unit === 'string'
      ) {
        const factor = val.unit === 'px' ? 1 : 16;
        return val.value * factor;
      }
      if (typeof val === 'string') {
        const v = val.trim();
        if (v === '0') return 0;
        const unitMatch = /^(-?\d*\.?\d+)(px|rem|em)$/.exec(v);
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
    for (const { path, token } of letterSpacings) {
      if (!path.startsWith('letterSpacings.')) continue;
      const val = token.$value;
      const num = parse(val);
      if (num !== null) numeric.add(num);
      if (
        isRecord(val) &&
        typeof val.value === 'number' &&
        typeof val.unit === 'string'
      ) {
        values.add(`${String(val.value)}${val.unit}`);
      }
    }
    if (numeric.size === 0 && values.size === 0) {
      context.report({
        message:
          'design-token/letter-spacing requires letter-spacing tokens; configure tokens with $type "dimension" under a "letterSpacings" group to enable this rule.',
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
              message: `Unexpected letter spacing ${String(value)}`,
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
