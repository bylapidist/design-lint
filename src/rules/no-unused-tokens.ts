import { z } from 'zod';
import type { RuleModule } from '../core/types.js';

interface NoUnusedTokensOptions {
  ignore?: string[];
}

export const noUnusedTokensRule: RuleModule<NoUnusedTokensOptions> = {
  name: 'design-system/no-unused-tokens',
  meta: {
    description: 'report unused design tokens',
    category: 'design-token',
    fixable: null,
    stability: 'stable' as const,
    rationale: {
      why: 'Unused tokens accumulate in the token graph and block safe removal. Surfacing them at lint time enables confident token pruning.',
      since: 'v8.0.0',
    },
    capabilities: {
      tokenUsage: true,
    },
    schema: z
      .object({
        ignore: z.array(z.string()).optional(),
      })
      .strict()
      .optional(),
  },
  create() {
    return {};
  },
  createRun(context) {
    return {
      onRunComplete: async () => {
        const unusedTokens = await context.tokenUsage.getUnusedTokens(
          context.options?.ignore,
        );
        for (const token of unusedTokens) {
          context.report({
            message: `Token ${token.value} is defined but never used`,
            line: 1,
            column: 1,
            metadata: {
              path: token.path,
              pointer: token.pointer,
              deprecated: token.deprecated,
              extensions: token.extensions,
            },
          });
        }
      },
    };
  },
};
