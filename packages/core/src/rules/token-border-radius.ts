import ts from 'typescript';
import valueParser from 'postcss-value-parser';
import type { RuleModule } from '../core/types.js';
import {
  matchToken,
  extractVarName,
  closestToken,
} from '../core/token-utils.js';
import { isStyleValue } from '@lapidist/design-lint-shared';

interface BorderRadiusOptions {
  units?: string[];
}

export const borderRadiusRule: RuleModule<BorderRadiusOptions> = {
  name: 'design-token/border-radius',
  meta: { description: 'enforce border-radius tokens' },
  create(context) {
    const radiiTokens = context.tokens.borderRadius;
    if (
      !radiiTokens ||
      (Array.isArray(radiiTokens)
        ? radiiTokens.length === 0
        : Object.keys(radiiTokens).length === 0)
    ) {
      context.report({
        message:
          'design-token/border-radius requires radius tokens; configure tokens.borderRadius to enable this rule.',
        line: 1,
        column: 1,
      });
      return {};
    }
    if (Array.isArray(radiiTokens)) {
      return {
        onCSSDeclaration(decl) {
          if (decl.prop === 'border-radius') {
            const name = extractVarName(decl.value);
            if (!name || !matchToken(name, radiiTokens)) {
              const suggest = name ? closestToken(name, radiiTokens) : null;
              context.report({
                message: `Unexpected border radius ${decl.value}`,
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
      Object.values(radiiTokens)
        .map((v) => parse(v))
        .filter((n): n is number => n !== null),
    );
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
