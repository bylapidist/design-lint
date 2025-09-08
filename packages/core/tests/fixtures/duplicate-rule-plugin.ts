import type { PluginModule } from '../../src/index.ts';

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
