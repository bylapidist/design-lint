import type { RuleModule } from '../core/types.js';

export const noUnusedTokensRule: RuleModule = {
  name: 'design-system/no-unused-tokens',
  meta: {
    description: 'report unused design tokens',
    category: 'design-token',
  },
  create() {
    return {};
  },
};
