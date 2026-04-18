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
import type {
  GeneratorInput,
  TokenInput,
  RuleInput,
  ViolationInput,
} from '@lapidist/dscp';
import { loadConfig } from '../config/loader.js';
import { getFlattenedTokens, toThemeRecord } from '../utils/tokens/index.js';
import { builtInRules } from '../rules/index.js';
import type {
  DtifFlattenedToken,
  LintResult,
  LintMessage,
} from '../core/types.js';
import type { Config } from '../core/linter.js';
import { tryFetchKernelData } from './kernel-client.js';

interface ExportDesignSystemMdOptions {
  /** Output file path. Defaults to `./DESIGN_SYSTEM.md`. */
  out?: string;
  /** Optional path to a configuration file. */
  config?: string;
  /**
   * When true, run a lint pass against the configured patterns and populate
   * the `violations` section with aggregated violation patterns.
   * Defaults to false so the command remains fast for snapshot-only use cases.
   */
  lint?: boolean;
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

// ---------------------------------------------------------------------------
// Violation aggregation
// ---------------------------------------------------------------------------

/** Maps a rule ID to its CSS property type for violation reporting. */
const RULE_TO_CSS_PROPERTY: Record<string, string> = {
  'design-token/colors': 'color',
  'design-token/border-color': 'border-color',
  'design-token/font-size': 'font-size',
  'design-token/font-family': 'font-family',
  'design-token/font-weight': 'font-weight',
  'design-token/letter-spacing': 'letter-spacing',
  'design-token/line-height': 'line-height',
  'design-token/spacing': 'margin/padding',
  'design-token/border-radius': 'border-radius',
  'design-token/border-width': 'border-width',
  'design-token/box-shadow': 'box-shadow',
  'design-token/outline': 'outline',
  'design-token/opacity': 'opacity',
  'design-token/duration': 'transition-duration',
  'design-token/easing': 'transition-timing-function',
  'design-token/animation': 'animation',
  'design-token/blur': 'filter',
  'design-token/z-index': 'z-index',
};

/**
 * Extract the raw CSS value from a lint message.
 * Tries `metadata.rawValue` first, then looks for a quoted token in the
 * message text (e.g. `Unexpected color "#FF0000"` → `#FF0000`).
 */
function extractRawValue(msg: LintMessage): string {
  const fromMeta = msg.metadata?.rawValue;
  if (typeof fromMeta === 'string' && fromMeta.length > 0) return fromMeta;
  // Match single or double quoted values, or bare values after "value"
  const quoted = /["']([^"']+)["']/.exec(msg.message);
  if (quoted?.[1]) return quoted[1];
  // Try matching the last word-like token in the message
  const wordMatch = /\b([\w#().,%]+)$/.exec(msg.message.trimEnd());
  return wordMatch?.[1] ?? msg.message;
}

interface ViolationKey {
  property: string;
  rawValue: string;
}

/**
 * Aggregate lint results into DSCP ViolationInput patterns.
 * Groups messages by CSS property + raw value and counts occurrences.
 */
export function aggregateViolations(results: LintResult[]): ViolationInput[] {
  const counts = new Map<
    string,
    { key: ViolationKey; correctToken: string | null; count: number }
  >();

  for (const result of results) {
    for (const msg of result.messages) {
      const property = RULE_TO_CSS_PROPERTY[msg.ruleId];
      if (!property) continue; // skip non-token rules

      const rawValue = extractRawValue(msg);
      const mapKey = `${property}:::${rawValue}`;
      const existing = counts.get(mapKey);
      if (existing) {
        existing.count++;
        // Prefer the first fix text as the correctToken
        if (existing.correctToken === null && msg.fix?.text) {
          existing.correctToken = msg.fix.text;
        }
      } else {
        counts.set(mapKey, {
          key: { property, rawValue },
          correctToken: msg.fix?.text ?? null,
          count: 1,
        });
      }
    }
  }

  return Array.from(counts.values()).map(({ key, correctToken, count }) => ({
    property: key.property,
    rawValue: key.rawValue,
    frequency: count,
    correctToken,
    agentAttributed: false,
  }));
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

  // Optionally run a lint pass to populate the violations section.
  let violations: ViolationInput[] = [];
  if (options.lint) {
    try {
      const [{ createNodeEnvironment }, { createLinter }] = await Promise.all([
        import('../adapters/node/environment.js'),
        import('../index.js'),
      ]);
      const env = createNodeEnvironment(config, {
        configPath: config.configPath,
        patterns: config.patterns,
      });
      const linter = createLinter(config, env);
      const patterns = config.patterns ?? ['.'];
      const { results } = await linter.lintTargets(patterns, false, []);
      violations = aggregateViolations(results);
    } catch {
      // Lint pass failed (e.g. no source files) — proceed with empty violations
    }
  }

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
    violations,
  };

  const doc = generateDocument(input);
  const content = renderMarkdown(doc);

  fs.writeFileSync(outPath, content, 'utf8');

  const violationsNote =
    violations.length > 0
      ? `, ${violations.length.toString()} violation pattern${violations.length === 1 ? '' : 's'}`
      : '';
  console.log(
    `DESIGN_SYSTEM.md generated: ${allTokens.length.toString()} tokens, ${builtInRules.length.toString()} rules${violationsNote} → ${outPath}`,
  );
}
