import type { PluginModule } from './types';

export interface LoadedPlugin {
  path: string;
  plugin: PluginModule;
}

export interface PluginLoader {
  load(path: string, configPath?: string): Promise<LoadedPlugin>;
}
