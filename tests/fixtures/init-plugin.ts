import type { PluginModule } from '../../src/core/types.js';
import type { Environment } from '../../src/core/environment.js';

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
