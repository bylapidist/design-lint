/**
 * `design-lint export-design-system-md` command implementation.
 *
 * Generates a `DESIGN_SYSTEM.md` file from the current kernel state.
 *
 * The output is structured for both human reading and agent parsing via typed
 * fenced sections that use `<!-- dscp:<type> -->` comment delimiters, as
 * specified in the DSCP v1 format.
 *
 * ### Output sections
 *
 * - `dscp:meta`      — schema version, generation timestamp, snapshot hash
 * - `dscp:tokens:<type>` — one section per DTIF token type
 * - `dscp:rules`     — all active rules with severity and rationale
 * - `dscp:violations` — placeholder for violation patterns (populated at runtime)
 */
import fs from 'fs';
import path from 'path';
import { loadConfig } from '../config/loader.js';
import { getFlattenedTokens, toThemeRecord } from '../utils/tokens/index.js';
import { builtInRules } from '../rules/index.js';
import type { DtifFlattenedToken } from '../core/types.js';

const DSCP_SPEC_VERSION = '1.0.0';
const DSCP_SCHEMA = 'https://dscp.lapidist.net/schema/v1.json';

interface ExportDesignSystemMdOptions {
  /** Output file path. Defaults to `./DESIGN_SYSTEM.md`. */
  out?: string;
  /** Optional path to a configuration file. */
  config?: string;
}

function tokenValueToString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return JSON.stringify(value);
}

function groupTokensByType(
  tokens: DtifFlattenedToken[],
): Map<string, DtifFlattenedToken[]> {
  const groups = new Map<string, DtifFlattenedToken[]>();
  for (const token of tokens) {
    const type = token.type ?? 'unknown';
    const existing = groups.get(type);
    if (existing) {
      existing.push(token);
    } else {
      groups.set(type, [token]);
    }
  }
  return groups;
}

function renderTokenSection(
  type: string,
  tokens: DtifFlattenedToken[],
): string {
  const rows = tokens.map((t) => {
    const value = tokenValueToString(t.value);
    const desc = t.metadata.description ?? '';
    const deprecated = t.metadata.deprecated ? ' _(deprecated)_' : '';
    return `| \`${t.pointer}\` | \`${value}\` | ${desc}${deprecated} |`;
  });

  return [
    `<!-- dscp:tokens:${type} -->`,
    `### ${type.charAt(0).toUpperCase() + type.slice(1)} Tokens`,
    '',
    '| Token | Value | Description |',
    '|-------|-------|-------------|',
    ...rows,
    `<!-- /dscp:tokens:${type} -->`,
    '',
  ].join('\n');
}

function renderRulesSection(): string {
  const rows = builtInRules.map((rule) => {
    const fixable = rule.meta.fixable ? '✓' : '';
    const rationale = rule.meta.rationale?.why ?? rule.meta.description;
    const short =
      rationale.length > 80 ? rationale.slice(0, 77) + '…' : rationale;
    return `| \`${rule.name}\` | ${String(rule.meta.category)} | ${fixable} | ${short} |`;
  });

  return [
    '<!-- dscp:rules -->',
    '### Design Lint Rules',
    '',
    '| Rule | Category | Auto-fix | Rationale |',
    '|------|----------|----------|-----------|',
    ...rows,
    '<!-- /dscp:rules -->',
    '',
  ].join('\n');
}

function renderViolationsSection(): string {
  return [
    '<!-- dscp:violations -->',
    '### Known Violation Patterns',
    '',
    '_Populated at runtime by `design-lint`. Run `design-lint export-design-system-md` after a full lint pass to include violation frequency data._',
    '',
    '<!-- /dscp:violations -->',
    '',
  ].join('\n');
}

function renderMeta(snapshotHash: string): string {
  const now = new Date().toISOString();
  return [
    '<!-- dscp:meta -->',
    `<!-- $schema: ${DSCP_SCHEMA} -->`,
    `<!-- specVersion: ${DSCP_SPEC_VERSION} -->`,
    `<!-- generatedAt: ${now} -->`,
    `<!-- kernelSnapshotHash: ${snapshotHash} -->`,
    '<!-- /dscp:meta -->',
    '',
  ].join('\n');
}

function generateSnapshotHash(tokens: DtifFlattenedToken[]): string {
  // Deterministic hash stub: uses pointer list as a stable fingerprint.
  // Phase 5 will replace this with the DSR kernel's real snapshot hash.
  const payload = tokens
    .map((t) => t.pointer)
    .sort()
    .join('|');
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Export a `DESIGN_SYSTEM.md` file from the current design-lint kernel state.
 *
 * @param options - Command options controlling output path and config location.
 */
export async function exportDesignSystemMd(
  options: ExportDesignSystemMdOptions,
): Promise<void> {
  const outPath = path.resolve(
    process.cwd(),
    options.out ?? 'DESIGN_SYSTEM.md',
  );

  const config = await loadConfig(process.cwd(), options.config);
  const tokensByTheme = toThemeRecord(config.tokens);
  const themes = Object.keys(tokensByTheme);
  const primaryTheme = themes[0] ?? 'default';

  const allTokens = [
    ...getFlattenedTokens(tokensByTheme, primaryTheme, {
      nameTransform: config.nameTransform,
    }),
  ];

  const tokenGroups = groupTokensByType(allTokens);
  const snapshotHash = generateSnapshotHash(allTokens);

  const sections: string[] = [
    '# DESIGN_SYSTEM.md',
    '',
    '> Auto-generated by `design-lint export-design-system-md`. Do not edit by hand.',
    '>',
    '> Structured for both human reading and AI agent consumption (DSCP v1).',
    '',
    renderMeta(snapshotHash),
    '---',
    '',
    '## Tokens',
    '',
  ];

  for (const [type, tokens] of [...tokenGroups.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    sections.push(renderTokenSection(type, tokens));
  }

  sections.push('---', '', '## Rules', '', renderRulesSection());
  sections.push(
    '---',
    '',
    '## Violation Patterns',
    '',
    renderViolationsSection(),
  );

  const content = sections.join('\n');
  fs.writeFileSync(outPath, content, 'utf8');

  const tokenCount = allTokens.length;
  const ruleCount = builtInRules.length;
  console.log(
    `DESIGN_SYSTEM.md generated: ${tokenCount.toString()} tokens, ${ruleCount.toString()} rules → ${outPath}`,
  );
}
