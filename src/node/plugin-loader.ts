import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import { realpathIfExists, relFromCwd } from '../utils/paths.js';
import type { PluginModule } from '../core/types.js';
import type { PluginLoader, LoadedPlugin } from '../core/plugin-loader.js';
import { createEngineError } from '../core/plugin-manager.js';

export class NodePluginLoader implements PluginLoader {
  async load(p: string, configPath?: string): Promise<LoadedPlugin> {
    const req = configPath
      ? createRequire(configPath)
      : createRequire(import.meta.url);
    let resolved: string;
    try {
      resolved = realpathIfExists(req.resolve(p));
    } catch {
      resolved = realpathIfExists(path.resolve(p));
    }
    if (!fs.existsSync(resolved)) {
      throw createEngineError({
        message: `Plugin not found: "${relFromCwd(resolved)}"`,
        context: `Plugin "${p}"`,
        remediation: 'Ensure the plugin is installed and resolvable.',
      });
    }
    let mod: unknown;
    try {
      if (resolved.endsWith('.mjs')) {
        mod = await import(
          `${pathToFileURL(resolved).href}?t=${String(Date.now())}`
        );
      } else {
        mod = req(resolved);
      }
    } catch (e: unknown) {
      if (getErrorCode(e) === 'ERR_REQUIRE_ESM') {
        mod = await import(
          `${pathToFileURL(resolved).href}?t=${String(Date.now())}`
        );
      } else {
        throw createEngineError({
          message: `Failed to load plugin "${p}": ${
            e instanceof Error ? e.message : String(e)
          }`,
          context: `Plugin "${p}"`,
          remediation: 'Ensure the plugin is installed and resolvable.',
        });
      }
    }
    const plugin = resolvePlugin(mod);
    return { path: resolved, plugin: plugin as PluginModule };
  }
}

function resolvePlugin(mod: unknown): unknown {
  if (isRecord(mod)) return mod.default ?? mod.plugin ?? mod;
  return mod;
}

function getErrorCode(e: unknown): string | undefined {
  return isRecord(e) && typeof e.code === 'string' ? e.code : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
