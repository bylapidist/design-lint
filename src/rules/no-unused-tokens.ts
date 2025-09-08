import type { RuleModule } from '../engine/types.js';

export const noUnusedTokensRule: RuleModule = {
  name: 'design-system/no-unused-tokens',
  meta: { description: 'report unused design tokens' },
  create() {
    return {};
  },
};
