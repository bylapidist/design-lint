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

interface SpacingOptions {
  base?: number;
  units?: string[];
}

export const spacingRule = tokenRule<SpacingOptions>({
  name: 'design-token/spacing',
  meta: {
    description: 'enforce spacing scale',
    category: 'design-token',
    schema: z
      .object({
        base: z.number().optional(),
        units: z.array(z.string()).optional(),
      })
      .optional(),
  },
  tokens: 'dimension',
  message:
    'design-token/spacing requires spacing tokens; configure tokens with $type "dimension" under a "spacing" group to enable this rule.',
  getAllowed(_context, dtifTokens: readonly DtifFlattenedToken[] = []) {
    const allowed = new Set<number>();
    for (const token of dtifTokens) {
      if (!isTokenInGroup(token, 'spacing')) continue;
      const value = toDimensionValue(token.value);
      if (value !== null) {
        allowed.add(value);
      }
    }
    return allowed;
  },
  create(context, allowed) {
    const opts = context.options ?? {};
    const base = opts.base ?? 4;
    const isAllowed = (n: number) => allowed.has(n) || n % base === 0;
    const allowedUnits = new Set(
      (opts.units ?? ['px', 'rem', 'em']).map((u) => u.toLowerCase()),
    );
    const parse = (text: string): number | null => {
      const trimmed = text.trim();
      if (trimmed === '') return null;
      const parsed = valueParser.unit(trimmed);
      if (parsed) {
        const num = parseFloat(parsed.number);
        return isNaN(num) ? null : num;
      }
      const num = Number(trimmed);
      return isNaN(num) ? null : num;
    };
    return {
      onNode(node) {
        if (!isStyleValue(node)) return;
        const report = (raw: string, value: number, n: ts.Node) => {
          if (!isAllowed(value)) {
            const pos = n
              .getSourceFile()
              .getLineAndCharacterOfPosition(n.getStart());
            context.report({
              message: `Unexpected spacing ${raw}`,
              line: pos.line + 1,
              column: pos.character + 1,
            });
          }
        };
        if (ts.isNumericLiteral(node)) {
          if (ts.isPrefixUnaryExpression(node.parent)) return;
          report(node.getText(), Number(node.text), node);
        } else if (
          ts.isPrefixUnaryExpression(node) &&
          ts.isNumericLiteral(node.operand)
        ) {
          const value = Number(node.operand.text);
          const num =
            node.operator === ts.SyntaxKind.MinusToken ? -value : value;
          report(node.getText(), num, node);
        } else if (ts.isNoSubstitutionTemplateLiteral(node)) {
          const num = parse(node.text);
          if (num !== null) report(node.text, num, node);
        } else if (ts.isTemplateExpression(node)) {
          const sf = node.getSourceFile();
          const checkLiteral = (
            lit: ts.TemplateHead | ts.TemplateMiddle | ts.TemplateTail,
          ) => {
            const num = parse(lit.text);
            if (num !== null && !isAllowed(num)) {
              const pos = sf.getLineAndCharacterOfPosition(lit.getStart());
              context.report({
                message: `Unexpected spacing ${lit.text}`,
                line: pos.line + 1,
                column: pos.character + 1,
              });
            }
          };
          checkLiteral(node.head);
          for (const span of node.templateSpans) {
            checkLiteral(span.literal);
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
});

function toDimensionValue(value: unknown): number | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const raw: unknown = Reflect.get(value, 'value');
  return typeof raw === 'number' ? raw : null;
}
