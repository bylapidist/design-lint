import type { PluginModule } from './types.js';

export interface LoadedPlugin {
  path: string;
  plugin: PluginModule;
}

export interface PluginLoader {
  load(path: string, configPath?: string): Promise<LoadedPlugin>;
}
