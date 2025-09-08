import type { PluginModule } from '@lapidist/design-lint-core';

const plugin: PluginModule = {
  rules: [
    {
      name: 'plugin/test',
      meta: { description: 'duplicate test rule' },
      create() {
        return {};
      },
    },
  ],
};

export default plugin;
