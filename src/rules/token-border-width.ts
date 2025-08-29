import ts from 'typescript';
import valueParser from 'postcss-value-parser';
import type { RuleModule } from '../core/types.js';

export const borderWidthRule: RuleModule = {
  name: 'design-token/border-width',
  meta: { description: 'enforce border-width tokens' },
  create(context) {
    const widthTokens =
      context.tokens?.borderWidths ?? context.tokens?.borderWidth;
    if (!widthTokens || Object.keys(widthTokens).length === 0) {
      context.report({
        message:
          'design-token/border-width requires border width tokens; configure tokens.borderWidths or tokens.borderWidth to enable this rule.',
        line: 1,
        column: 1,
      });
      return {};
    }
    const parse = (val: unknown): number | null => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const parsed = valueParser.unit(val);
        if (parsed) return parseFloat(parsed.number);
        const num = Number(val);
        if (!isNaN(num)) return num;
      }
      return null;
    };
    const allowed = new Set(
      Object.values(widthTokens)
        .map((v) => parse(v))
        .filter((n): n is number => n !== null),
    );
    const allowedUnits = new Set(
      (
        (context.options as { units?: string[] } | undefined)?.units ?? [
          'px',
          'rem',
          'em',
        ]
      ).map((u) => u.toLowerCase()),
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
              message: `Unexpected border width ${value}`,
              line: pos.line + 1,
              column: pos.character + 1,
            });
          }
        }
      },
      onCSSDeclaration(decl) {
        if (decl.prop === 'border-width') {
          let reported = false;
          valueParser(decl.value).walk((node) => {
            if (reported) return false;
            if (node.type === 'function') return false;
            if (node.type !== 'word') return;
            const parsed = valueParser.unit(node.value);
            if (!parsed || !parsed.unit) return;
            const num = parseFloat(parsed.number);
            const unit = parsed.unit.toLowerCase();
            if (!isNaN(num) && allowedUnits.has(unit) && !allowed.has(num)) {
              context.report({
                message: `Unexpected border width ${node.value}`,
                line: decl.line,
                column: decl.column,
              });
              reported = true;
            }
          });
        }
      },
    };
  },
};

export default borderWidthRule;
