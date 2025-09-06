import ts from 'typescript';
import valueParser from 'postcss-value-parser';
import type { RuleModule } from '../core/types.js';
import {
  matchToken,
  extractVarName,
  closestToken,
} from '../utils/token-match.js';
import { isInNonStyleJsx } from '../utils/jsx.js';

export const opacityRule: RuleModule = {
  name: 'design-token/opacity',
  meta: { description: 'enforce opacity tokens' },
  create(context) {
    const opacityTokens = context.tokens?.opacity;
    if (
      !opacityTokens ||
      (Array.isArray(opacityTokens)
        ? opacityTokens.length === 0
        : Object.keys(opacityTokens).length === 0)
    ) {
      context.report({
        message:
          'design-token/opacity requires opacity tokens; configure tokens.opacity to enable this rule.',
        line: 1,
        column: 1,
      });
      return {};
    }
    if (Array.isArray(opacityTokens)) {
      return {
        onCSSDeclaration(decl) {
          if (decl.prop === 'opacity') {
            const name = extractVarName(decl.value);
            if (!name || !matchToken(name, opacityTokens)) {
              const suggest = name ? closestToken(name, opacityTokens) : null;
              context.report({
                message: `Unexpected opacity ${decl.value}`,
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
        const num = Number(val);
        if (!isNaN(num)) return num;
      }
      return null;
    };
    const allowed = new Set(
      Object.values(opacityTokens)
        .map((v) => parse(v))
        .filter((n): n is number => n !== null),
    );
    return {
      onNode(node) {
        if (isInNonStyleJsx(node)) return;
        if (ts.isNumericLiteral(node)) {
          const value = Number(node.text);
          if (!allowed.has(value)) {
            const pos = node
              .getSourceFile()
              .getLineAndCharacterOfPosition(node.getStart());
            context.report({
              message: `Unexpected opacity ${value}`,
              line: pos.line + 1,
              column: pos.character + 1,
            });
          }
        }
      },
      onCSSDeclaration(decl) {
        if (decl.prop === 'opacity') {
          const parsed = valueParser.unit(decl.value);
          const num = parsed ? parseFloat(parsed.number) : Number(decl.value);
          if (!isNaN(num) && !allowed.has(num)) {
            context.report({
              message: `Unexpected opacity ${decl.value}`,
              line: decl.line,
              column: decl.column,
            });
          }
        }
      },
    };
  },
};
