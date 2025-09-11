import { z } from 'zod';
import type { RuleModule } from '../core/types';

export const noUnusedTokensRule: RuleModule = {
  name: 'design-system/no-unused-tokens',
  meta: {
    description: 'report unused design tokens',
    category: 'design-token',
    schema: z.void(),
  },
  create() {
    return {};
  },
};
