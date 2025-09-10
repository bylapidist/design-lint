import ts from 'typescript';
import valueParser from 'postcss-value-parser';
import type { RuleModule } from '../core/types.js';
import { isStyleValue } from '../utils/style.js';

interface BorderRadiusOptions {
  units?: string[];
}

export const borderRadiusRule: RuleModule<BorderRadiusOptions> = {
  name: 'design-token/border-radius',
  meta: {
    description: 'enforce border-radius tokens',
    category: 'design-token',
  },
  create(context) {
    const radiusTokens = context.getFlattenedTokens('dimension');
    const allowed = new Set<number>();
    for (const { path, token } of radiusTokens) {
      if (!path.startsWith('radius.')) continue;
      const val = token.$value;
      if (typeof val === 'number') {
        allowed.add(val);
      } else if (typeof val === 'string') {
        const parsed = valueParser.unit(val);
        if (parsed) {
          const num = parseFloat(parsed.number);
          if (!isNaN(num)) allowed.add(num);
        }
      } else if (
        val &&
        typeof val === 'object' &&
        'value' in (val as Record<string, unknown>) &&
        typeof (val as { value?: unknown }).value === 'number'
      ) {
        allowed.add((val as { value: number }).value);
      }
    }
    if (allowed.size === 0) {
      context.report({
        message:
          'design-token/border-radius requires radius tokens; configure tokens with $type "dimension" under a "radius" group to enable this rule.',
        line: 1,
        column: 1,
      });
      return {};
    }
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
};
