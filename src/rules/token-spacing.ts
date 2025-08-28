import ts from 'typescript';
import type { RuleModule } from '../core/types';

export const spacingRule: RuleModule = {
  name: 'design-token/spacing',
  meta: { description: 'enforce spacing scale' },
  create(context) {
    const allowed = new Set(Object.values(context.tokens?.spacing || {}));
    const base = (context.options as { base?: number } | undefined)?.base ?? 4;
    const isAllowed = (n: number) => allowed.has(n) || n % base === 0;
    const allowedUnits = new Set(['px', 'rem', 'em']);
    return {
      onNode(node) {
        if (ts.isNumericLiteral(node)) {
          const value = Number(node.text);
          if (!isAllowed(value)) {
            const pos = node
              .getSourceFile()
              .getLineAndCharacterOfPosition(node.getStart());
            context.report({
              message: `Unexpected spacing ${value}`,
              line: pos.line + 1,
              column: pos.character + 1,
            });
          }
        }
      },
      onCSSDeclaration(decl) {
        const matches = decl.value.matchAll(/(-?\d*\.?\d+)([a-z%]*)/gi);
        for (const m of matches) {
          const num = parseFloat(m[1]);
          const unit = m[2].toLowerCase();
          if (!isNaN(num) && allowedUnits.has(unit) && !isAllowed(num)) {
            context.report({
              message: `Unexpected spacing ${m[0]}`,
              line: decl.line,
              column: decl.column,
            });
            break;
          }
        }
      },
    };
  },
};
