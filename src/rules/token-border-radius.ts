import ts from 'typescript';
import valueParser from 'postcss-value-parser';
import { z } from 'zod';
import type { DtifFlattenedToken } from '../core/types.js';
import { rules, guards } from '../utils/index.js';

const { tokenRule } = rules;
const {
  ast: { isStyleValue },
  domain: { isTokenInGroup },
} = guards;

interface BorderRadiusOptions {
  units?: string[];
}

export const borderRadiusRule = tokenRule<BorderRadiusOptions>({
  name: 'design-token/border-radius',
  meta: {
    description: 'enforce border-radius tokens',
    category: 'design-token',
    schema: z.object({ units: z.array(z.string()).optional() }).optional(),
  },
  tokens: 'dimension',
  message:
    'design-token/border-radius requires border radius tokens; configure tokens with $type "dimension" under a "radius" group to enable this rule.',
  getAllowed(_context, dtifTokens: readonly DtifFlattenedToken[] = []) {
    const allowed = new Set<number>();
    for (const token of dtifTokens) {
      if (!isTokenInGroup(token, 'radius')) continue;
      const value = toDimensionValue(token.value);
      if (value !== null) {
        allowed.add(value);
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

function toDimensionValue(value: unknown): number | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const raw: unknown = Reflect.get(value, 'value');
  return typeof raw === 'number' ? raw : null;
}
