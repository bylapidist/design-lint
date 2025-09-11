import type { Config } from './linter.js';
import type { RuleModule } from './types.js';
import type { PluginLoader } from './plugin-loader.js';
import type { Environment } from './environment.js';
import { PluginError } from './errors.js';
import { isRecord } from '../utils/is-record.js';
import { isRuleModule } from '../utils/is-rule-module.js';

export interface PluginMeta {
  path: string;
  name?: string;
  version?: string;
}

export class PluginManager {
  private metadata: PluginMeta[] = [];

  constructor(
    private config: Config,
    private ruleMap: Map<string, { rule: RuleModule; source: string }>,
    private loader: PluginLoader,
  ) {}

  async getPlugins(env: Environment): Promise<PluginMeta[]> {
    if (this.metadata.length > 0) return this.metadata;
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
      if (typeof plugin.init === 'function') {
        await plugin.init(env);
      }
      for (const rule of plugin.rules) {
        if (
          !isRuleModule(rule, { requireMeta: true, requireNonEmptyName: true })
        ) {
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
      this.metadata.push({
        path: pluginSource,
        name: plugin.name,
        version: plugin.version,
      });
    }
    return this.metadata;
  }
}

function getRuleName(rule: unknown): string | undefined {
  return isRecord(rule) && typeof rule.name === 'string'
    ? rule.name
    : undefined;
}
