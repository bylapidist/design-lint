import type { PluginModule } from '../../src/core/types';

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
