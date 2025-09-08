import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import type { Config } from '../engine/linter.js';
import type { RuleModule } from '../engine/types.js';
import { realpathIfExists, relFromCwd } from './paths.js';
import { createEngineError } from '../engine/error.js';

export class PluginManager {
  private req: NodeJS.Require;
  private pluginPaths: string[] = [];

  constructor(private config: Config) {
    this.req = config.configPath
      ? createRequire(config.configPath)
      : createRequire(import.meta.url);
  }

  private resolvePluginPaths(): string[] {
    const paths: string[] = [];
    for (const p of this.config.plugins ?? []) {
      try {
        const resolved = realpathIfExists(this.req.resolve(p));
        if (!fs.existsSync(resolved)) {
          throw createEngineError({
            message: `Plugin not found: "${relFromCwd(resolved)}"`,
            context: `Plugin "${p}"`,
            remediation: 'Ensure the plugin is installed and resolvable.',
          });
        }
        paths.push(resolved);
      } catch {
        const resolved = realpathIfExists(path.resolve(p));
        if (!fs.existsSync(resolved)) {
          throw createEngineError({
            message: `Plugin not found: "${relFromCwd(resolved)}"`,
            context: `Plugin "${p}"`,
            remediation: 'Ensure the plugin is installed and resolvable.',
          });
        }
        paths.push(resolved);
      }
    }
    return paths;
  }

  async load(
    ruleMap: Map<string, { rule: RuleModule; source: string }>,
  ): Promise<string[]> {
    if (this.pluginPaths.length > 0) return this.pluginPaths;
    const pluginPaths = this.resolvePluginPaths();
    const names = this.config.plugins ?? [];
    for (let i = 0; i < pluginPaths.length; i++) {
      const pluginSource = pluginPaths[i];
      const name = names[i] ?? pluginSource;
      let mod: unknown;
      try {
        if (pluginSource.endsWith('.mjs')) {
          mod = await import(
            `${pathToFileURL(pluginSource).href}?t=${String(Date.now())}`
          );
        } else {
          mod = this.req(pluginSource);
        }
      } catch (e: unknown) {
        if (getErrorCode(e) === 'ERR_REQUIRE_ESM') {
          mod = await import(
            `${pathToFileURL(pluginSource).href}?t=${String(Date.now())}`
          );
        } else {
          throw createEngineError({
            message: `Failed to load plugin "${name}": ${
              e instanceof Error ? e.message : String(e)
            }`,
            context: `Plugin "${name}"`,
            remediation: 'Ensure the plugin is installed and resolvable.',
          });
        }
      }
      const plugin = resolvePlugin(mod);
      if (!isRecord(plugin) || !Array.isArray(plugin.rules)) {
        throw createEngineError({
          message: `Invalid plugin "${pluginSource}": expected { rules: RuleModule[] }`,
          context: `Plugin "${pluginSource}"`,
          remediation: 'Export an object with a "rules" array.',
        });
      }
      for (const rule of plugin.rules) {
        if (!isRuleModule(rule)) {
          const ruleName = getRuleName(rule) ?? '<unknown>';
          throw createEngineError({
            message:
              `Invalid rule "${ruleName}" in plugin "${pluginSource}": ` +
              'expected { name: string; meta: { description: string }; create: Function }',
            context: `Plugin "${pluginSource}"`,
            remediation:
              'Ensure each rule has a non-empty name, meta.description, and a create function.',
          });
        }
        const existing = ruleMap.get(rule.name);
        if (existing) {
          throw createEngineError({
            message: `Rule "${rule.name}" from plugin "${pluginSource}" conflicts with rule from "${existing.source}"`,
            context: `Plugin "${pluginSource}"`,
            remediation: 'Use a unique rule name to avoid collisions.',
          });
        }
        ruleMap.set(rule.name, { rule, source: pluginSource });
      }
    }
    this.pluginPaths = pluginPaths;
    return pluginPaths;
  }
}

function resolvePlugin(mod: unknown): unknown {
  if (isRecord(mod)) return mod.default ?? mod.plugin ?? mod;
  return mod;
}

function getErrorCode(e: unknown): string | undefined {
  return isRecord(e) && typeof e.code === 'string' ? e.code : undefined;
}

function getRuleName(rule: unknown): string | undefined {
  return isRecord(rule) && typeof rule.name === 'string'
    ? rule.name
    : undefined;
}

function isRuleModule(value: unknown): value is RuleModule {
  return (
    isRecord(value) &&
    typeof value.name === 'string' &&
    value.name.trim() !== '' &&
    isRecord(value.meta) &&
    typeof value.meta.description === 'string' &&
    value.meta.description.trim() !== '' &&
    typeof value.create === 'function'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
