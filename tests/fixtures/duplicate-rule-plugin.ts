import type { PluginModule } from '../../src/core/types.ts';

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
