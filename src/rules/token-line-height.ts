import ts from 'typescript';
import { tokenRule } from '../utils/token-rule.js';
import { isStyleValue } from '../utils/ast/index.js';

const parse = (val: string): number | null => {
  const v = val.trim();
  const unitMatch = /^(\d*\.?\d+)(px|rem|em)%?$/.exec(v);
  if (unitMatch) {
    const [, num, unit] = unitMatch;
    const n = parseFloat(num);
    const factor = unit === 'px' ? 1 : unit === 'rem' || unit === 'em' ? 16 : 1;
    return n * factor;
  }
  const pctMatch = /^(\d*\.?\d+)%$/.exec(v);
  if (pctMatch) return parseFloat(pctMatch[1]) / 100;
  const num = Number(v);
  return isNaN(num) ? null : num;
};

export const lineHeightRule = tokenRule({
  name: 'design-token/line-height',
  meta: { description: 'enforce line-height tokens', category: 'design-token' },
  tokens: 'number',
  message:
    'design-token/line-height requires line height tokens; configure tokens with $type "number" under a "lineHeights" group to enable this rule.',
  getAllowed(tokens) {
    const allowed = new Set<number>();
    for (const { path, token } of tokens) {
      if (!path.startsWith('lineHeights.')) continue;
      const val = token.$value;
      if (typeof val === 'number') allowed.add(val);
    }
    return allowed;
  },
  create(context, allowed) {
    return {
      onNode(node) {
        if (!isStyleValue(node)) return;
        const report = (raw: string, value: number, n: ts.Node) => {
          if (!allowed.has(value)) {
            const pos = n
              .getSourceFile()
              .getLineAndCharacterOfPosition(n.getStart());
            context.report({
              message: `Unexpected line height ${raw}`,
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
            if (num !== null && !allowed.has(num)) {
              const pos = sf.getLineAndCharacterOfPosition(lit.getStart());
              context.report({
                message: `Unexpected line height ${lit.text}`,
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
});
