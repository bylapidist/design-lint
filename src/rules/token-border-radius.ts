import ts from 'typescript';
import valueParser from 'postcss-value-parser';
import { tokenRule } from './utils/token-rule.js';
import { isStyleValue } from '../utils/style.js';

interface BorderRadiusOptions {
  units?: string[];
}

export const borderRadiusRule = tokenRule<BorderRadiusOptions>({
  name: 'design-token/border-radius',
  meta: {
    description: 'enforce border-radius tokens',
    category: 'design-token',
  },
  tokens: 'dimension',
  message:
    'design-token/border-radius requires radius tokens; configure tokens with $type "dimension" under a "radius" group to enable this rule.',
  getAllowed(tokens) {
    const allowed = new Set<number>();
    for (const { path, token } of tokens) {
      if (!path.startsWith('radius.')) continue;
      const val = token.$value;
      if (val && typeof val === 'object') {
        const num: unknown = Reflect.get(val, 'value');
        if (typeof num === 'number') {
          allowed.add(num);
        }
      }
    }
    return allowed;
  },
  create(context, allowed) {
    const allowedUnits = new Set(
      (context.options?.units ?? ['px', 'rem', 'em']).map((u) =>
        u.toLowerCase(),
      ),
    );
    return {
      onNode(node) {
        if (!isStyleValue(node)) return;
        if (ts.isNumericLiteral(node)) {
          const value = Number(node.text);
          if (!allowed.has(value)) {
            const pos = node
              .getSourceFile()
              .getLineAndCharacterOfPosition(node.getStart());
            context.report({
              message: `Unexpected border radius ${String(value)}`,
              line: pos.line + 1,
              column: pos.character + 1,
            });
          }
        }
      },
      onCSSDeclaration(decl) {
        if (decl.prop === 'border-radius') {
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
                message: `Unexpected border radius ${node.value}`,
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
});
