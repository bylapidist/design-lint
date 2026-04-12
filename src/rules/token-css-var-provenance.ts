import valueParser from 'postcss-value-parser';
import { z } from 'zod';
import type { RuleModule } from '../core/types.js';

/**
 * Detects CSS custom property references (var(--foo)) that are not backed by
 * a DTIF token. Helps prevent "ghost" variables that exist in CSS but are not
 * part of the design system and therefore drift silently.
 */
export const cssVarProvenanceRule: RuleModule = {
  name: 'design-token/css-var-provenance',
  meta: {
    description: 'disallow CSS variable references not backed by a DTIF token',
    category: 'design-token',
    fixable: null,
    stability: 'stable' as const,
    rationale: {
      why: 'CSS variables that exist outside the token graph cannot be enforced, audited, or renamed safely across the design system.',
      since: 'v8.0.0',
    },
    schema: z.void(),
  },
  create(context) {
    const allTokens = context.getDtifTokens();
    const knownVarNames = new Set<string>();
    for (const token of allTokens) {
      const parts = token.pointer.replace(/^#\//, '').split('/');
      const varName = `--${parts.join('-')}`;
      knownVarNames.add(varName);
      knownVarNames.add(varName.toLowerCase());
    }

    const check = (value: string, line: number, column: number) => {
      const parsed = valueParser(value);
      parsed.walk((node) => {
        if (node.type !== 'function' || node.value.toLowerCase() !== 'var') {
          return;
        }
        if (node.nodes.length === 0 || node.nodes[0].type !== 'word') return;
        const varName = node.nodes[0].value;
        if (!varName.startsWith('--')) return;
        if (
          !knownVarNames.has(varName) &&
          !knownVarNames.has(varName.toLowerCase())
        ) {
          context.report({
            message: `CSS variable "${varName}" is not backed by a DTIF token`,
            line,
            column: column + node.sourceIndex,
          });
        }
        return false;
      });
    };

    return {
      onCSSDeclaration(decl) {
        check(decl.value, decl.line, decl.column);
      },
    };
  },
};
