import ts from 'typescript';
import valueParser from 'postcss-value-parser';
import type { RuleModule } from '../core/types.js';
import { matchToken, extractVarName } from '../utils/token-match.js';

export const spacingRule: RuleModule = {
  name: 'design-token/spacing',
  meta: { description: 'enforce spacing scale' },
  create(context) {
    const spacingTokens = context.tokens?.spacing;
    if (
      !spacingTokens ||
      (Array.isArray(spacingTokens)
        ? spacingTokens.length === 0
        : Object.keys(spacingTokens).length === 0)
    ) {
      context.report({
        message:
          'design-token/spacing requires spacing tokens; configure tokens.spacing to enable this rule.',
        line: 1,
        column: 1,
      });
      return {};
    }
    if (Array.isArray(spacingTokens)) {
      return {
        onCSSDeclaration(decl) {
          const name = extractVarName(decl.value);
          if (!name || !matchToken(name, spacingTokens)) {
            context.report({
              message: `Unexpected spacing ${decl.value}`,
              line: decl.line,
              column: decl.column,
            });
          }
        },
      };
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
          if (node.parent && ts.isPrefixUnaryExpression(node.parent)) return;
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
};
