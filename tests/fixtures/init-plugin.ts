import type { PluginModule } from '../../src/core/types.ts';
import type { Environment } from '../../src/core/environment.ts';

export const inits: Environment[] = [];

const plugin: PluginModule = {
  name: 'init-plugin',
  version: '1.0.0',
  rules: [],
  init(env) {
    inits.push(env);
  },
};

export default plugin;
