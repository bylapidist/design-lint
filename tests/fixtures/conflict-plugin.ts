import type { PluginModule } from '../../packages/core/src/core/types.ts';

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
