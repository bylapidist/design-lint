import type { Config } from './linter.js';
import type { RuleModule } from './types.js';
import type { PluginLoader } from './plugin-loader.js';
import { PluginError } from './errors.js';

export class PluginManager {
  private pluginPaths: string[] = [];

  constructor(
    private config: Config,
    private ruleMap: Map<string, { rule: RuleModule; source: string }>,
    private loader: PluginLoader,
  ) {}

  async getPlugins(): Promise<string[]> {
    if (this.pluginPaths.length > 0) return this.pluginPaths;
    const names = this.config.plugins ?? [];
    for (const name of names) {
      const { path: pluginSource, plugin } = await this.loader.load(
        name,
        this.config.configPath,
      );
      if (!isRecord(plugin) || !Array.isArray(plugin.rules)) {
        throw new PluginError({
          message: `Invalid plugin "${pluginSource}": expected { rules: RuleModule[] }`,
          context: `Plugin "${pluginSource}"`,
          remediation: 'Export an object with a "rules" array.',
        });
      }
      for (const rule of plugin.rules) {
        if (!isRuleModule(rule)) {
          const ruleName = getRuleName(rule) ?? '<unknown>';
          throw new PluginError({
            message:
              `Invalid rule "${ruleName}" in plugin "${pluginSource}": ` +
              'expected { name: string; meta: { description: string }; create: Function }',
            context: `Plugin "${pluginSource}"`,
            remediation:
              'Ensure each rule has a non-empty name, meta.description, and a create function.',
          });
        }
        const existing = this.ruleMap.get(rule.name);
        if (existing) {
          throw new PluginError({
            message: `Rule "${rule.name}" from plugin "${pluginSource}" conflicts with rule from "${existing.source}"`,
            context: `Plugin "${pluginSource}"`,
            remediation: 'Use a unique rule name to avoid collisions.',
          });
        }
        this.ruleMap.set(rule.name, { rule, source: pluginSource });
      }
      this.pluginPaths.push(pluginSource);
    }
    return this.pluginPaths;
  }
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
