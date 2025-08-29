import ts from 'typescript';
import valueParser from 'postcss-value-parser';
import type { RuleModule } from '../core/types.js';

export const spacingRule: RuleModule = {
  name: 'design-token/spacing',
  meta: { description: 'enforce spacing scale' },
  create(context) {
    const spacingTokens = context.tokens?.spacing;
    if (!spacingTokens || Object.keys(spacingTokens).length === 0) {
      context.report({
        message:
          'design-token/spacing requires spacing tokens; configure tokens.spacing to enable this rule.',
        line: 1,
        column: 1,
      });
      return {};
    }
    const allowed = new Set(Object.values(spacingTokens));
    const opts =
      (context.options as { base?: number; units?: string[] } | undefined) ??
      {};
    const base = opts.base ?? 4;
    const isAllowed = (n: number) => allowed.has(n) || n % base === 0;
    const allowedUnits = new Set(
      (opts.units ?? ['px', 'rem', 'em']).map((u) => u.toLowerCase()),
    );
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
        let reported = false;
        valueParser(decl.value).walk((node) => {
          if (reported) return false;
          if (node.type === 'function') return false;
          if (node.type !== 'word') return;
          const parsed = valueParser.unit(node.value);
          if (!parsed || !parsed.unit) return;
          const num = parseFloat(parsed.number);
          const unit = parsed.unit.toLowerCase();
          if (!isNaN(num) && allowedUnits.has(unit) && !isAllowed(num)) {
            context.report({
              message: `Unexpected spacing ${node.value}`,
              line: decl.line,
              column: decl.column,
            });
            reported = true;
          }
        });
      },
    };
  },
};
