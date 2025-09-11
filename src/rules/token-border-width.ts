import ts from 'typescript';
import valueParser from 'postcss-value-parser';
import { z } from 'zod';
import { tokenRule } from './utils/token-rule.js';
import { isStyleValue } from '../utils/style.js';
import { isRecord } from '../utils/type-guards.js';

interface BorderWidthOptions {
  units?: string[];
}

export const borderWidthRule = tokenRule<BorderWidthOptions>({
  name: 'design-token/border-width',
  meta: {
    description: 'enforce border-width tokens',
    category: 'design-token',
    schema: z.object({ units: z.array(z.string()).optional() }).optional(),
  },
  tokens: 'dimension',
  message:
    'design-token/border-width requires border width tokens; configure tokens with $type "dimension" under a "borderWidths" group to enable this rule.',
  getAllowed(tokens) {
    const parse = (val: unknown): number | null =>
      isRecord(val) && typeof val.value === 'number' ? val.value : null;
    const allowed = new Set<number>();
    for (const { path, token } of tokens) {
      if (!path.startsWith('borderWidths.')) continue;
      const num = parse(token.$value);
      if (num !== null) allowed.add(num);
    }
    return allowed;
  },
  create(context, allowed) {
    const allowedUnits = new Set(
      (context.options?.units ?? ['px', 'rem', 'em']).map((u) =>
        u.toLowerCase(),
      ),
    );
    const parseValue = (text: string): number | null => {
      const trimmed = text.trim();
      if (trimmed === '') return null;
      const parsed = valueParser.unit(trimmed);
      if (parsed) {
        const n = parseFloat(parsed.number);
        return isNaN(n) ? null : n;
      }
      const num = Number(trimmed);
      return isNaN(num) ? null : num;
    };
    return {
      onNode(node) {
        if (!isStyleValue(node)) return;
        const report = (raw: string, value: number, n: ts.Node) => {
          if (!allowed.has(value)) {
            const pos = n
              .getSourceFile()
              .getLineAndCharacterOfPosition(n.getStart());
            context.report({
              message: `Unexpected border width ${raw}`,
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
          const num = parseValue(node.text);
          if (num !== null) report(node.text, num, node);
        } else if (ts.isTemplateExpression(node)) {
          const sf = node.getSourceFile();
          const checkLiteral = (
            lit: ts.TemplateHead | ts.TemplateMiddle | ts.TemplateTail,
          ) => {
            const num = parseValue(lit.text);
            if (num !== null && !allowed.has(num)) {
              const pos = sf.getLineAndCharacterOfPosition(lit.getStart());
              context.report({
                message: `Unexpected border width ${lit.text}`,
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
});

export default borderWidthRule;
