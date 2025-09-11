import type { PluginModule } from '../../src/core/types.js';

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
