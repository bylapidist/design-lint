import ts from 'typescript';
import type { RuleModule } from '../core/types.js';

export const lineHeightRule: RuleModule = {
  name: 'design-token/line-height',
  meta: { description: 'enforce line-height tokens' },
  create(context) {
    const lineHeights = context.tokens?.typography?.lineHeights;
    if (!lineHeights || Object.keys(lineHeights).length === 0) {
      context.report({
        message:
          'design-token/line-height requires typography.lineHeights tokens; configure tokens.typography.lineHeights to enable this rule.',
        line: 1,
        column: 1,
      });
      return {};
    }
    const parse = (val: unknown): number | null => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const v = val.trim();
        const unitMatch = v.match(/^(\d*\.?\d+)(px|rem|em)$/);
        if (unitMatch) {
          const [, num, unit] = unitMatch;
          const n = parseFloat(num);
          const factor = unit === 'px' ? 1 : 16;
          return n * factor;
        }
        const pctMatch = v.match(/^(\d*\.?\d+)%$/);
        if (pctMatch) {
          return parseFloat(pctMatch[1]) / 100;
        }
        const num = Number(v);
        if (!isNaN(num)) return num;
      }
      return null;
    };
    const allowed = new Set(
      Object.values(lineHeights)
        .map((v) => parse(v))
        .filter((n): n is number => n !== null),
    );
    return {
      onNode(node) {
        if (ts.isNumericLiteral(node)) {
          const value = Number(node.text);
          if (!allowed.has(value)) {
            const pos = node
              .getSourceFile()
              .getLineAndCharacterOfPosition(node.getStart());
            context.report({
              message: `Unexpected line height ${value}`,
              line: pos.line + 1,
              column: pos.character + 1,
            });
          }
        }
      },
      onCSSDeclaration(decl) {
        if (decl.prop === 'line-height') {
          const num = parse(decl.value);
          if (num !== null && !allowed.has(num)) {
            context.report({
              message: `Unexpected line height ${decl.value}`,
              line: decl.line,
              column: decl.column,
            });
          }
        }
      },
    };
  },
};
