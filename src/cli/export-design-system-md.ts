/**
 * `design-lint export-design-system-md` command implementation.
 *
 * Generates a `DESIGN_SYSTEM.md` file from the current kernel state using the
 * canonical `@lapidist/dscp` generator. The output conforms to the DSCP v1
 * specification and is structured for both human reading and AI agent
 * consumption via typed fenced sections.
 */
import fs from 'fs';
import path from 'path';
import { generateDocument, renderMarkdown } from '@lapidist/dscp';
import type { GeneratorInput, TokenInput, RuleInput } from '@lapidist/dscp';
import { loadConfig } from '../config/loader.js';
import { getFlattenedTokens, toThemeRecord } from '../utils/tokens/index.js';
import { builtInRules } from '../rules/index.js';
import type { DtifFlattenedToken } from '../core/types.js';
import type { Config } from '../core/linter.js';
import { tryFetchKernelData } from './kernel-client.js';

interface ExportDesignSystemMdOptions {
  /** Output file path. Defaults to `./DESIGN_SYSTEM.md`. */
  out?: string;
  /** Optional path to a configuration file. */
  config?: string;
}

export type LoadConfigFn = (
  cwd: string,
  configPath?: string,
) => Promise<Config>;

/**
 * Map a DtifFlattenedToken to the minimal TokenInput shape expected by
 * @lapidist/dscp. DtifFlattenedToken satisfies TokenInput structurally, but
 * we map explicitly so the compiler can verify compatibility.
 */
function toTokenInput(token: DtifFlattenedToken): TokenInput {
  const base: TokenInput = { pointer: token.pointer, name: token.name };
  if (token.type !== undefined) {
    return { ...base, type: token.type };
  }
  return base;
}

/**
 * Resolve the configured severity and enabled state of a rule from config.rules.
 * Falls back to `{ severity: 'warn', enabled: true }` when the rule is not
 * explicitly configured (i.e. default-enabled rules).
 */
function resolveRuleConfig(
  ruleName: string,
  configRules: Record<string, unknown>,
): { severity: 'warn' | 'error'; enabled: boolean } {
  const setting = configRules[ruleName];
  if (setting === undefined) return { severity: 'warn', enabled: true };
  const raw: unknown = Array.isArray(setting) ? setting[0] : setting;
  if (raw === 'off' || raw === 0) return { severity: 'warn', enabled: false };
  if (raw === 'error' || raw === 2) return { severity: 'error', enabled: true };
  return { severity: 'warn', enabled: true };
}

/**
 * Map a built-in rule to the RuleInput shape expected by @lapidist/dscp,
 * using the actual severity and enabled state from the loaded config.
 */
function toRuleInput(
  rule: (typeof builtInRules)[number],
  configRules: Record<string, unknown>,
): RuleInput {
  const { severity, enabled } = resolveRuleConfig(rule.name, configRules);
  return {
    id: rule.name,
    description: rule.meta.description,
    severity,
    enabled,
    category: String(rule.meta.category),
    fixable: rule.meta.fixable != null,
  };
}

/**
 * Export a `DESIGN_SYSTEM.md` file from the current design-lint configuration.
 *
 * @param options      - Command options controlling output path and config location.
 * @param loadConfigFn - Optional override for config loading (used in tests).
 */
export async function exportDesignSystemMd(
  options: ExportDesignSystemMdOptions,
  loadConfigFn?: LoadConfigFn,
): Promise<void> {
  const outPath = path.resolve(
    process.cwd(),
    options.out ?? 'DESIGN_SYSTEM.md',
  );

  const configLoader = loadConfigFn ?? loadConfig;
  const config = await configLoader(process.cwd(), options.config);
  const tokensByTheme = toThemeRecord(config.tokens);
  const themes = Object.keys(tokensByTheme);
  const primaryTheme = themes[0] ?? 'default';

  const allTokens = [
    ...getFlattenedTokens(tokensByTheme, primaryTheme, {
      nameTransform: config.nameTransform,
    }),
  ];

  const tokenMap = new Map<string, TokenInput>(
    allTokens.map((t) => [t.pointer, toTokenInput(t)]),
  );

  const byType = new Map<string, TokenInput[]>();
  for (const token of allTokens) {
    const type = token.type ?? 'unknown';
    const existing = byType.get(type);
    if (existing) {
      existing.push(toTokenInput(token));
    } else {
      byType.set(type, [toTokenInput(token)]);
    }
  }

  const kernelData = await tryFetchKernelData();

  const configRules = config.rules ?? {};
  const input: GeneratorInput = {
    snapshotHash: kernelData?.snapshotHash ?? 'local',
    tokenGraph: { tokens: tokenMap, byType },
    ruleRegistry: {
      rules: new Map(
        builtInRules.map((r) => [r.name, toRuleInput(r, configRules)]),
      ),
    },
    componentRegistry: {
      components: kernelData?.componentEntries ?? new Map(),
    },
    deprecationLedger: {
      entries: kernelData?.deprecationEntries ?? new Map(),
    },
    violations: [],
  };

  const doc = generateDocument(input);
  const content = renderMarkdown(doc);

  fs.writeFileSync(outPath, content, 'utf8');

  console.log(
    `DESIGN_SYSTEM.md generated: ${allTokens.length.toString()} tokens, ${builtInRules.length.toString()} rules → ${outPath}`,
  );
}
