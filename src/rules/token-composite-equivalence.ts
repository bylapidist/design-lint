import { z } from 'zod';
import type { RuleModule } from '../core/types.js';

/**
 * Detects multi-part CSS values (e.g. borders, backgrounds, transitions) that
 * match an existing composite token exactly, meaning the author could have
 * used the token instead.
 */
export const compositeEquivalenceRule: RuleModule = {
  name: 'design-token/composite-equivalence',
  meta: {
    description:
      'disallow raw composite values that match an existing composite token',
    category: 'design-token',
    fixable: 'code' as const,
    stability: 'stable' as const,
    rationale: {
      why: 'Raw composite values bypass composite token semantics, making global design system updates impossible without manual find-and-replace.',
      since: 'v8.0.0',
    },
    schema: z.void(),
  },
  create(context) {
    const compositeTypes = [
      'boxShadow',
      'border',
      'typography',
      'transition',
    ] as const;
    const compositeTokens = compositeTypes.flatMap((t) =>
      context.getDtifTokens(t),
    );

    if (compositeTokens.length === 0) {
      return {};
    }

    const compositeValues = new Map<string, string>();
    for (const token of compositeTokens) {
      const v = token.value;
      if (typeof v === 'string' && v.trim().length > 0) {
        compositeValues.set(normalise(v), token.pointer);
      } else if (v !== null && typeof v === 'object') {
        const serialised = JSON.stringify(v);
        compositeValues.set(normalise(serialised), token.pointer);
      }
    }

    return {
      onCSSDeclaration(decl) {
        const normValue = normalise(decl.value);
        const match = compositeValues.get(normValue);
        if (match) {
          context.report({
            message: `Raw value matches composite token "${match}"; use the token reference instead`,
            line: decl.line,
            column: decl.column,
          });
        }
      },
    };
  },
};

function normalise(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}
