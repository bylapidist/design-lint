import type { Config } from './linter.js';
import type { RuleModule } from './types.js';
import { builtInRules } from '../rules/index.js';
import { PluginManager, createEngineError } from './plugin-manager.js';
import type { Env } from '@lapidist/design-lint-shared';
import { nodeEnv } from '@lapidist/design-lint-shared';

export class RuleRegistry {
  private ruleMap = new Map<string, { rule: RuleModule; source: string }>();
  private pluginLoad: Promise<void>;
  private pluginPaths: string[] = [];
  private pluginManager: PluginManager;
  constructor(
    private config: Config,
    private env: Env = nodeEnv,
  ) {
    for (const rule of builtInRules) {
      this.ruleMap.set(rule.name, { rule, source: 'built-in' });
    }
    this.pluginManager = new PluginManager(this.config, this.ruleMap, env);
    this.pluginLoad = this.pluginManager.getPlugins().then((paths) => {
      this.pluginPaths = paths;
    });
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
        entries.push({ rule, options, severity });
      }
    }
    if (unknown.length > 0) {
      throw createEngineError({
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
}
