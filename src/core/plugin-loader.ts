import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import type { Config } from './linter.js';
import type { PluginModule, RuleModule } from './types.js';

interface EngineErrorOptions {
  message: string;
  context: string;
  remediation: string;
}

export async function loadPlugins(
  config: Config,
  ruleMap: Map<string, { rule: RuleModule; source: string }>,
  createEngineError: (opts: EngineErrorOptions) => Error,
): Promise<void> {
  const req = config.configPath
    ? createRequire(config.configPath)
    : createRequire(import.meta.url);
  for (const p of config.plugins || []) {
    let mod: unknown;
    let resolved: string | undefined;
    try {
      resolved = req.resolve(p);
      if (resolved.endsWith('.mjs')) {
        mod = await import(`${pathToFileURL(resolved).href}?t=${Date.now()}`);
      } else {
        mod = req(resolved);
      }
    } catch (e: unknown) {
      if ((e as { code?: string }).code === 'ERR_REQUIRE_ESM') {
        const esmPath = resolved ?? p;
        mod = await import(`${pathToFileURL(esmPath).href}?t=${Date.now()}`);
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
    const pluginSource = resolved ?? p;
    const plugin =
      (mod as { default?: PluginModule; plugin?: PluginModule }).default ??
      (mod as { plugin?: PluginModule }).plugin ??
      (mod as PluginModule);
    if (
      !plugin ||
      typeof plugin !== 'object' ||
      !Array.isArray((plugin as PluginModule).rules)
    ) {
      throw createEngineError({
        message: `Invalid plugin "${pluginSource}": expected { rules: RuleModule[] }`,
        context: `Plugin "${pluginSource}"`,
        remediation: 'Export an object with a "rules" array.',
      });
    }
    for (const rule of plugin.rules) {
      if (
        !rule ||
        typeof rule.name !== 'string' ||
        rule.name.trim() === '' ||
        !rule.meta ||
        typeof rule.meta.description !== 'string' ||
        rule.meta.description.trim() === '' ||
        typeof rule.create !== 'function'
      ) {
        throw createEngineError({
          message:
            `Invalid rule "${(rule as { name?: string }).name ?? '<unknown>'}" in plugin "${pluginSource}": ` +
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
}
