import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import type { Config } from './linter.js';
import { realpathIfExists, relFromCwd } from '../utils/paths.js';

/**
 * Resolve absolute paths for plugins defined in the config.
 * @param config Linter configuration
 * @returns Array of resolved plugin paths
 */
export function resolvePluginPaths(config: Config): string[] {
  const req = config.configPath
    ? createRequire(config.configPath)
    : createRequire(import.meta.url);
  const paths: string[] = [];
  for (const p of config.plugins || []) {
    try {
      const resolved = realpathIfExists(req.resolve(p));
      if (!fs.existsSync(resolved))
        throw new Error(`Plugin not found: "${relFromCwd(resolved)}"`);
      paths.push(resolved);
    } catch {
      const resolved = realpathIfExists(path.resolve(p));
      if (!fs.existsSync(resolved))
        throw new Error(`Plugin not found: "${relFromCwd(resolved)}"`);
      paths.push(resolved);
    }
  }
  return paths;
}
