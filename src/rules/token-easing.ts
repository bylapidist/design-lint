import valueParser from 'postcss-value-parser';
import { z } from 'zod';
import { rules } from '../utils/index.js';

const { tokenRule } = rules;

/**
 * Matches cubic-bezier(...) and steps(...) timing function notations.
 */
const EASING_PATTERN =
  /\bcubic-bezier\s*\(|steps\s*\(|step-start\b|step-end\b/i;

export const easingRule = tokenRule({
  name: 'design-token/easing',
  meta: {
    description:
      'disallow raw easing values — use cubicBezier or duration tokens',
    category: 'design-token',
    fixable: null,
    stability: 'stable' as const,
    rationale: {
      why: 'Raw cubic-bezier and step timing values bypass the design system and produce inconsistent motion across surfaces.',
      since: 'v8.0.0',
    },
    schema: z.void(),
  },
  tokens: 'cubicBezier',
  message:
    'design-token/easing requires cubicBezier tokens; add $type "cubicBezier" tokens to enable this rule.',
  getAllowed(_context, dtifTokens) {
    const allowed = new Set<string>();
    for (const token of dtifTokens) {
      const v = token.value;
      if (typeof v === 'string') allowed.add(v.toLowerCase());
    }
    return allowed;
  },
  create(context, allowed) {
    const check = (value: string, line: number, column: number) => {
      const parsed = valueParser(value);
      parsed.walk((node) => {
        if (node.type !== 'function' && node.type !== 'word') return;
        const raw = valueParser.stringify(node);
        if (!EASING_PATTERN.test(raw)) return;
        if (!allowed.has(raw.toLowerCase())) {
          context.report({
            message: `Unexpected easing value "${raw}"; use a cubicBezier token instead`,
            line,
            column: column + node.sourceIndex,
          });
          return false;
        }
      });
    };

    return {
      onCSSDeclaration(decl) {
        if (
          decl.prop === 'animation-timing-function' ||
          decl.prop === 'transition-timing-function' ||
          decl.prop === 'animation'
        ) {
          check(decl.value, decl.line, decl.column);
        }
      },
    };
  },
});
