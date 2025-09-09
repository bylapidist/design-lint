import ts from 'typescript';
import valueParser from 'postcss-value-parser';
import type { RuleModule } from '../core/types.js';
import {
  matchToken,
  extractVarName,
  closestToken,
} from '../core/token-utils.js';
import { isStyleValue } from '../utils/style.js';

interface BorderWidthOptions {
  units?: string[];
}

export const borderWidthRule: RuleModule<BorderWidthOptions> = {
  name: 'design-token/border-width',
  meta: {
    description: 'enforce border-width tokens',
    category: 'design-token',
  },
  create(context) {
    const widthTokens = context.tokens.borderWidths;
    if (
      !widthTokens ||
      (Array.isArray(widthTokens)
        ? widthTokens.length === 0
        : Object.keys(widthTokens).length === 0)
    ) {
      context.report({
        message:
          'design-token/border-width requires border width tokens; configure tokens.borderWidths to enable this rule.',
        line: 1,
        column: 1,
      });
      return {};
    }
    if (Array.isArray(widthTokens)) {
      return {
        onCSSDeclaration(decl) {
          if (decl.prop === 'border-width') {
            const name = extractVarName(decl.value);
            if (!name || !matchToken(name, widthTokens)) {
              const suggest = name ? closestToken(name, widthTokens) : null;
              context.report({
                message: `Unexpected border width ${decl.value}`,
                line: decl.line,
                column: decl.column,
                suggest: suggest ?? undefined,
              });
            }
          }
        },
      };
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
};

export default borderWidthRule;
