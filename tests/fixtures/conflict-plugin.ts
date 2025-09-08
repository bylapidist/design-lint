import type { PluginModule } from '../../src/engine/types.ts';

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
