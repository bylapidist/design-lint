import ts from 'typescript';
import valueParser from 'postcss-value-parser';
import type { RuleModule } from '../engine/types.js';
import {
  matchToken,
  extractVarName,
  closestToken,
} from '../engine/token-utils.js';
import { isStyleValue } from '../engine/style.js';

export const durationRule: RuleModule = {
  name: 'design-token/duration',
  meta: { description: 'enforce duration tokens' },
  create(context) {
    const durationTokens = context.tokens.durations;
    if (
      !durationTokens ||
      (Array.isArray(durationTokens)
        ? durationTokens.length === 0
        : Object.keys(durationTokens).length === 0)
    ) {
      context.report({
        message:
          'design-token/duration requires duration tokens; configure tokens.durations to enable this rule.',
        line: 1,
        column: 1,
      });
      return {};
    }
    if (Array.isArray(durationTokens)) {
      const checkVar = (value: string, line: number, column: number) => {
        const name = extractVarName(value);
        if (!name || !matchToken(name, durationTokens)) {
          const suggest = name ? closestToken(name, durationTokens) : null;
          context.report({
            message: `Unexpected duration ${value}`,
            line,
            column,
            suggest: suggest ?? undefined,
          });
        }
      };
      return {
        onCSSDeclaration(decl) {
          const prop = decl.prop.toLowerCase();
          if (
            prop === 'transition' ||
            prop === 'transition-duration' ||
            prop === 'animation' ||
            prop === 'animation-duration'
          ) {
            checkVar(decl.value, decl.line, decl.column);
          }
        },
      };
    }
    const parse = (val: unknown): number | null => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const v = val.trim();
        const match = /^(-?\d*\.?\d+)(ms|s)$/.exec(v);
        if (match) {
          const num = parseFloat(match[1]);
          return match[2] === 's' ? num * 1000 : num;
        }
        const num = Number(v);
        if (!isNaN(num)) return num;
      }
      return null;
    };
    const allowed = new Set<number>();
    for (const val of Object.values(durationTokens)) {
      const num = parse(val);
      if (num !== null) allowed.add(num);
    }
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
              message: `Unexpected duration ${String(value)}`,
              line: pos.line + 1,
              column: pos.character + 1,
            });
          }
        }
      },
      onCSSDeclaration(decl) {
        const prop = decl.prop.toLowerCase();
        if (
          prop === 'transition' ||
          prop === 'transition-duration' ||
          prop === 'animation' ||
          prop === 'animation-duration'
        ) {
          let reported = false;
          valueParser(decl.value).walk((node) => {
            if (reported) return false;
            if (node.type === 'function') return false;
            if (node.type !== 'word') return;
            const parsed = valueParser.unit(node.value);
            if (!parsed || !parsed.unit) return;
            const unit = parsed.unit.toLowerCase();
            if (unit !== 'ms' && unit !== 's') return;
            const num = parseFloat(parsed.number);
            const ms = unit === 's' ? num * 1000 : num;
            if (!allowed.has(ms)) {
              context.report({
                message: `Unexpected duration ${node.value}`,
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
