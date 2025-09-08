import type { PluginModule } from '@lapidist/design-lint-core';

const plugin: PluginModule = {
  rules: [
    {
      name: 'design-token/colors',
      meta: { description: 'conflicting rule' },
      create() {
        return {};
      },
    },
  ],
};

export default plugin;
