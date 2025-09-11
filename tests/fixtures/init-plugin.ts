import type { PluginModule } from '../../src/core/types.ts';
import type { Environment } from '../../src/core/environment.ts';

export let initCount = 0;
export let receivedEnv: Environment | undefined;

const plugin: PluginModule = {
  name: 'init-plugin',
  version: '0.1.0',
  rules: [],
  init(env) {
    initCount++;
    receivedEnv = env;
  },
};

export default plugin;
