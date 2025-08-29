import type { PluginModule } from '../../src/core/types.ts';

const plugin: PluginModule = {
  rules: [
    {
      name: '',
      meta: {} as any,
      create: 42 as any,
    } as any,
  ],
};

export default plugin;
