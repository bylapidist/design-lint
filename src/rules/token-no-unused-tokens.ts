import type { RuleModule } from '../core/types.js';

export const tokenNoUnusedTokensRule: RuleModule = {
  name: 'design-token/no-unused-tokens',
  meta: { description: 'report unused design tokens from config' },
  create() {
    return {};
  },
};
