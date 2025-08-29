import ts from 'typescript';
import valueParser from 'postcss-value-parser';
import type { RuleModule } from '../core/types.js';

export const durationRule: RuleModule = {
  name: 'design-token/duration',
  meta: { description: 'enforce motion duration tokens' },
  create(context) {
    const durationTokens =
      (context.tokens as any)?.durations ??
      (context.tokens as any)?.motion?.durations;
    if (!durationTokens || Object.keys(durationTokens).length === 0) {
      context.report({
        message:
          'design-token/duration requires duration tokens; configure tokens.durations or tokens.motion.durations to enable this rule.',
        line: 1,
        column: 1,
      });
      return {};
    }
    const parse = (val: unknown): number | null => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const v = val.trim();
        const match = v.match(/^(-?\d*\.?\d+)(ms|s)$/);
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
        if (ts.isNumericLiteral(node)) {
          const value = Number(node.text);
          if (!allowed.has(value)) {
            const pos = node
              .getSourceFile()
              .getLineAndCharacterOfPosition(node.getStart());
            context.report({
              message: `Unexpected duration ${value}`,
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
