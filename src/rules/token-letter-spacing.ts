import ts from 'typescript';
import { rules, guards } from '../utils/index.js';

const { tokenRule } = rules;
const {
  ast: { isStyleValue },
  data: { isRecord },
} = guards;

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

export const letterSpacingRule = tokenRule({
  name: 'design-token/letter-spacing',
  meta: {
    description: 'enforce letter-spacing tokens',
    category: 'design-token',
  },
  tokens: 'dimension',
  message:
    'design-token/letter-spacing requires letter-spacing tokens; configure tokens with $type "dimension" under a "letterSpacings" group to enable this rule.',
  getAllowed(tokens) {
    const numeric = new Set<number>();
    const values = new Set<string>();
    for (const { path, value } of tokens) {
      if (!path.startsWith('letterSpacings.')) continue;
      const val = value;
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
    return { numeric, values };
  },
  isEmpty(allowed) {
    return allowed.numeric.size === 0 && allowed.values.size === 0;
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
});
