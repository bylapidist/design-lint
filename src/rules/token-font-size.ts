import { tokenRule } from './utils/token-rule.js';
import { isRecord } from '../utils/type-guards.js';

const parseSize = (val: unknown): number | null => {
  if (
    isRecord(val) &&
    typeof val.value === 'number' &&
    typeof val.unit === 'string'
  ) {
    const factor = val.unit === 'px' ? 1 : 16;
    return val.value * factor;
  }
  if (typeof val === 'string') {
    const match = /^(\d*\.?\d+)(px|rem|em)$/.exec(val.trim());
    if (match) {
      const [, num, unit] = match;
      const n = parseFloat(num);
      const factor = unit === 'px' ? 1 : 16;
      return n * factor;
    }
  }
  return null;
};

export const fontSizeRule = tokenRule({
  name: 'design-token/font-size',
  meta: { description: 'enforce font-size tokens', category: 'design-token' },
  tokens: 'dimension',
  message:
    'design-token/font-size requires font size tokens; configure tokens with $type "dimension" under a "fontSizes" group to enable this rule.',
  getAllowed(tokens) {
    const sizes = new Set<number>();
    for (const { path, token } of tokens) {
      if (!path.startsWith('fontSizes.')) continue;
      const num = parseSize(token.$value);
      if (num !== null) sizes.add(num);
    }
    return sizes;
  },
  create(context, sizes) {
    return {
      onCSSDeclaration(decl) {
        if (decl.prop === 'font-size') {
          const num = parseSize(decl.value);
          if (num !== null && !sizes.has(num)) {
            context.report({
              message: `Unexpected font size ${decl.value}`,
              line: decl.line,
              column: decl.column,
            });
          }
        }
      },
    };
  },
});
