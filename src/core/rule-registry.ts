import type { Config } from './linter.js';
import type { RuleModule } from './types.js';
import type { Environment } from './environment.js';
import { builtInRules } from '../rules/index.js';
import { PluginManager, type PluginMeta } from './plugin-manager.js';
import { ConfigError } from './errors.js';

export class RuleRegistry {
  private ruleMap = new Map<string, { rule: RuleModule; source: string }>();
  private pluginLoad: Promise<void>;
  private pluginPaths: string[] = [];
  private pluginMetadata: PluginMeta[] = [];
  private pluginManager?: PluginManager;
  constructor(
    private config: Config,
    env?: Environment,
  ) {
    for (const rule of builtInRules) {
      this.ruleMap.set(rule.name, { rule, source: 'built-in' });
    }
    if (env?.pluginLoader && (this.config.plugins?.length ?? 0) > 0) {
      this.pluginManager = new PluginManager(
        this.config,
        this.ruleMap,
        env.pluginLoader,
      );
      this.pluginLoad = this.pluginManager.getPlugins(env).then((meta) => {
        this.pluginMetadata = meta;
        this.pluginPaths = meta.map((m) => m.path);
      });
    } else {
      this.pluginLoad = Promise.resolve();
    }
  }

  async load(): Promise<void> {
    await this.pluginLoad;
  }

  getEnabledRules(): {
    rule: RuleModule;
    options: unknown;
    severity: 'error' | 'warn';
  }[] {
    const entries: {
      rule: RuleModule;
      options: unknown;
      severity: 'error' | 'warn';
    }[] = [];
    const ruleConfig: Record<string, unknown> = this.config.rules ?? {};
    const unknown: string[] = [];
    for (const [name, setting] of Object.entries(ruleConfig)) {
      const entry = this.ruleMap.get(name);
      if (!entry) {
        unknown.push(name);
        continue;
      }
      const rule = entry.rule;
      let severity: 'error' | 'warn' | undefined;
      let options: unknown = undefined;
      if (Array.isArray(setting)) {
        severity = this.normalizeSeverity(setting[0]);
        options = setting[1];
      } else {
        severity = this.normalizeSeverity(setting);
      }
      if (severity) {
        if (rule.meta.schema) {
          try {
            options = rule.meta.schema.parse(options);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            throw new ConfigError({
              message: `Invalid options for rule ${name}: ${msg}`,
              context: 'Config.rules',
              remediation: 'Review and fix the configuration file.',
            });
          }
        }
        entries.push({ rule, options, severity });
      }
    }
    if (unknown.length > 0) {
      throw new ConfigError({
        message: `Unknown rule(s): ${unknown.join(', ')}`,
        context: 'Config.rules',
        remediation: 'Remove or correct these rule names.',
      });
    }
    return entries;
  }

  private normalizeSeverity(value: unknown): 'error' | 'warn' | undefined {
    if (value === 0 || value === 'off') return undefined;
    if (value === 2 || value === 'error') return 'error';
    if (value === 1 || value === 'warn') return 'warn';
    return undefined;
  }

  async getPluginPaths(): Promise<string[]> {
    await this.pluginLoad;
    return this.pluginPaths;
  }

  async getPluginMetadata(): Promise<PluginMeta[]> {
    await this.pluginLoad;
    return this.pluginMetadata;
  }
}
