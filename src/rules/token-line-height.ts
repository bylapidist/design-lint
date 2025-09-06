import ts from 'typescript';
import type { RuleModule } from '../core/types.js';
import {
  matchToken,
  extractVarName,
  closestToken,
} from '../utils/token-match.js';
import { isInNonStyleJsx } from '../utils/jsx.js';

export const lineHeightRule: RuleModule = {
  name: 'design-token/line-height',
  meta: { description: 'enforce line-height tokens' },
  create(context) {
    const lineHeights = context.tokens?.lineHeights;
    if (
      !lineHeights ||
      (Array.isArray(lineHeights)
        ? lineHeights.length === 0
        : Object.keys(lineHeights).length === 0)
    ) {
      context.report({
        message:
          'design-token/line-height requires lineHeights tokens; configure tokens.lineHeights to enable this rule.',
        line: 1,
        column: 1,
      });
      return {};
    }
    if (Array.isArray(lineHeights)) {
      return {
        onCSSDeclaration(decl) {
          if (decl.prop === 'line-height') {
            const name = extractVarName(decl.value);
            if (!name || !matchToken(name, lineHeights)) {
              const suggest = name ? closestToken(name, lineHeights) : null;
              context.report({
                message: `Unexpected line height ${decl.value}`,
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
        const v = val.trim();
        if (v === '') return null;
        const unitMatch = v.match(/^(\d*\.?\d+)(px|rem|em)$/);
        if (unitMatch) {
          const [, num, unit] = unitMatch;
          const n = parseFloat(num);
          const factor = unit === 'px' ? 1 : 16;
          return n * factor;
        }
        const pctMatch = v.match(/^(\d*\.?\d+)%$/);
        if (pctMatch) {
          return parseFloat(pctMatch[1]) / 100;
        }
        const num = Number(v);
        if (!isNaN(num)) return num;
      }
      return null;
    };
    const allowed = new Set(
      Object.values(lineHeights)
        .map((v) => parse(v))
        .filter((n): n is number => n !== null),
    );
    return {
      onNode(node) {
        if (isInNonStyleJsx(node)) return;
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
};
