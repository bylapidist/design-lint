import { Linter as CoreLinter, type Config } from '../engine/linter.js';
import type { DocumentSource } from '../engine/document-source.js';
import { FileSource } from './file-source.js';
import { PluginManager } from './plugin-manager.js';
import { CacheService } from './cache-service.js';

export class Linter extends CoreLinter {
  constructor(config: Config, source: DocumentSource = new FileSource()) {
    super(config, {
      source,
      pluginManager: new PluginManager(config),
      cacheService: CacheService,
    });
  }
}

export { applyFixes } from './cache-manager.js';
export { loadIgnore } from './ignore.js';
export type { Config } from '../engine/linter.js';
