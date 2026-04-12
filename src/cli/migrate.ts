/**
 * `design-lint migrate` command implementation.
 *
 * Codemod that upgrades v7 config shapes to the v8 format.
 *
 * ### v7 → v8 changes
 *
 * 1. **`rules` values**: string shorthand (`'error'`, `'warn'`, `'off'`) is
 *    now written as-is. Numeric severity codes (0, 1, 2) are replaced with
 *    the string equivalents (`'off'`, `'warn'`, `'error'`).
 * 2. **`tokens`** key: previously a flat record of DTIF tokens, still valid
 *    in v8 — no migration required.
 * 3. **`extends`** key: was an array of plugin package names; now expressed as
 *    spread imports. The codemod adds a comment directing the user to switch
 *    to `import`-based presets.
 * 4. **`plugins`** key: v8 has no top-level `plugins` — each plugin registers
 *    its rules via `createLinter`. A migration comment is inserted.
 */
import fs from 'fs';
import path from 'path';

interface MigrateOptions {
  /** Path to the config file to migrate. Defaults to auto-detected config. */
  config?: string;
  /** Write migrated config to a new file instead of overwriting the original. */
  out?: string;
  /** Perform a dry run — print changes without writing. */
  dryRun?: boolean;
}

type RawConfig = Record<string, unknown>;

function isRecord(val: unknown): val is RawConfig {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

/** Map numeric severity codes to string equivalents. */
function migrateSeverityCode(value: unknown): unknown {
  if (value === 0) return 'off';
  if (value === 1) return 'warn';
  if (value === 2) return 'error';
  return value;
}

/** Migrate a single rule value from v7 to v8. */
function migrateRuleValue(value: unknown): unknown {
  // Numeric shorthand
  if (typeof value === 'number') return migrateSeverityCode(value);
  // Array: [severity, options] — only migrate the severity element
  if (Array.isArray(value) && value.length >= 1) {
    const first: unknown = value[0];
    const rest: unknown[] = value.slice(1);
    return [migrateSeverityCode(first), ...rest];
  }
  return value;
}

/** Migrate the `rules` object in place. */
function migrateRules(rules: unknown): unknown {
  if (!isRecord(rules)) return rules;
  const migrated: RawConfig = {};
  for (const [key, value] of Object.entries(rules)) {
    migrated[key] = migrateRuleValue(value);
  }
  return migrated;
}

/** Return an array of human-readable change descriptions. */
function diffChanges(original: RawConfig, migrated: RawConfig): string[] {
  const changes: string[] = [];
  const origStr = JSON.stringify(original);
  const migrStr = JSON.stringify(migrated);
  if (origStr === migrStr) return changes;

  if (JSON.stringify(original.rules) !== JSON.stringify(migrated.rules)) {
    changes.push(
      'rules: numeric severity codes migrated to string equivalents',
    );
  }
  if ('plugins' in original) {
    changes.push(
      'plugins: v8 no longer uses a top-level plugins array; ' +
        'register rules via createLinter() options instead.',
    );
  }
  if ('extends' in original) {
    changes.push(
      'extends: v8 uses import-based presets (e.g. @lapidist/design-lint-config-recommended); ' +
        'replace the extends array with spread imports.',
    );
  }
  return changes;
}

/**
 * Parse a JSON or JS config file into a plain object.
 * Only JSON configs are mutated automatically; JS configs receive annotated output.
 */
function parseJsonConfig(source: string): RawConfig {
  const raw: unknown = JSON.parse(source);
  if (!isRecord(raw)) throw new Error('Config root must be a JSON object');
  return raw;
}

function detectConfigPath(cwd: string): string {
  const candidates = [
    'designlint.config.json',
    '.designlintrc.json',
    'designlint.config.js',
    'designlint.config.mjs',
    'designlint.config.ts',
    'designlint.config.mts',
  ];
  for (const name of candidates) {
    const resolved = path.join(cwd, name);
    if (fs.existsSync(resolved)) return resolved;
  }
  throw new Error(
    'No design-lint config file found. Pass --config <path> to specify one.',
  );
}

/**
 * Migrate a v7 design-lint configuration to v8 format.
 *
 * @param options - Codemod options.
 */
export function migrateConfig(options: MigrateOptions): void {
  const configPath = options.config
    ? path.resolve(process.cwd(), options.config)
    : detectConfigPath(process.cwd());

  const ext = path.extname(configPath);
  const isJson = ext === '.json';

  const source = fs.readFileSync(configPath, 'utf8');

  if (!isJson) {
    // For JS/TS configs we emit a migration guide comment rather than rewriting
    const guide = [
      '/*',
      ' * design-lint v8 migration guide:',
      ' *',
      ' * 1. Numeric rule severities (0/1/2) → string ("off"/"warn"/"error")',
      ' * 2. Top-level "plugins" removed — register rules via createLinter() options',
      ' * 3. Top-level "extends" replaced by import-based presets:',
      ' *    import recommended from "@lapidist/design-lint-config-recommended";',
      ' *    export default defineConfig({ ...recommended, rules: { ... } })',
      ' */',
    ].join('\n');

    if (options.dryRun) {
      console.log('--- migration guide (dry run) ---');
      console.log(guide);
      console.log('---------------------------------');
      return;
    }

    const outPath = options.out
      ? path.resolve(process.cwd(), options.out)
      : configPath + '.migrated' + ext;

    fs.writeFileSync(outPath, guide + '\n\n' + source, 'utf8');
    console.log(`Migration guide prepended → ${outPath}`);
    return;
  }

  // JSON config — apply transformations
  const original = parseJsonConfig(source);
  const migrated: RawConfig = { ...original };

  if ('rules' in migrated) {
    migrated.rules = migrateRules(migrated.rules);
  }

  const changes = diffChanges(original, migrated);

  if (changes.length === 0) {
    console.log('Config is already compatible with v8 — no changes needed.');
    return;
  }

  const output = JSON.stringify(migrated, null, 2) + '\n';

  if (options.dryRun) {
    console.log('--- migrated config (dry run) ---');
    console.log(output);
    console.log('Changes:');
    for (const change of changes) {
      console.log(`  • ${change}`);
    }
    return;
  }

  const outPath = options.out
    ? path.resolve(process.cwd(), options.out)
    : configPath;

  fs.writeFileSync(outPath, output, 'utf8');

  console.log(`Migrated ${configPath} → ${outPath}`);
  for (const change of changes) {
    console.log(`  • ${change}`);
  }
}
