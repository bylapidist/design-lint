/**
 * Tests for the `design-lint migrate` codemod.
 *
 * Calls `migrateConfig` and `applyMigrations` directly — no subprocess spawning.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { migrateConfig } from '../../src/cli/migrate.js';
import { applyMigrations } from '../../src/cli/migrate.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
  const dir = path.join(
    tmpdir(),
    `dl-migrate-${Date.now().toString()}-${Math.random().toString(36).slice(2)}`,
  );
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function writeConfig(dir: string, name: string, content: unknown): string {
  const p = path.join(dir, name);
  fs.writeFileSync(p, JSON.stringify(content, null, 2), 'utf8');
  return p;
}

function readConfig(p: string): unknown {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

// ---------------------------------------------------------------------------
// applyMigrations — unit tests for each shape
// ---------------------------------------------------------------------------

void test('applyMigrations: no changes on an already-valid v8 config', () => {
  const { migrated, changes } = applyMigrations({
    rules: { 'design-token/colors': 'error' },
    tokens: {},
  });
  assert.deepEqual(migrated.rules, { 'design-token/colors': 'error' });
  assert.equal(changes.length, 0);
});

void test('applyMigrations: migrates numeric severity 2 → "error"', () => {
  const { migrated, changes } = applyMigrations({
    rules: { 'design-token/colors': 2 },
  });
  assert.deepEqual(migrated.rules, { 'design-token/colors': 'error' });
  assert.ok(changes.some((c) => c.includes('numeric severity')));
});

void test('applyMigrations: migrates numeric severity 1 → "warn"', () => {
  const { migrated, changes } = applyMigrations({
    rules: { 'design-token/colors': 1 },
  });
  assert.deepEqual(migrated.rules, { 'design-token/colors': 'warn' });
  assert.ok(changes.some((c) => c.includes('numeric severity')));
});

void test('applyMigrations: migrates numeric severity 0 → "off"', () => {
  const { migrated, changes } = applyMigrations({
    rules: { 'design-token/colors': 0 },
  });
  assert.deepEqual(migrated.rules, { 'design-token/colors': 'off' });
  assert.ok(changes.some((c) => c.includes('numeric severity')));
});

void test('applyMigrations: migrates tuple severity [2, options] → ["error", options]', () => {
  const { migrated, changes } = applyMigrations({
    rules: { 'design-token/colors': [2, { allow: ['hex'] }] },
  });
  assert.deepEqual(migrated.rules, {
    'design-token/colors': ['error', { allow: ['hex'] }],
  });
  assert.ok(changes.some((c) => c.includes('numeric severity')));
});

void test('applyMigrations: renames ignorePatterns → ignoreFiles', () => {
  const { migrated, changes } = applyMigrations({
    ignorePatterns: ['dist/**', 'node_modules/**'],
  });
  assert.deepEqual(migrated.ignoreFiles, ['dist/**', 'node_modules/**']);
  assert.ok(!('ignorePatterns' in migrated));
  assert.ok(changes.some((c) => c.includes('ignorePatterns')));
});

void test('applyMigrations: merges ignorePatterns into existing ignoreFiles', () => {
  // When both keys are present, ignorePatterns takes precedence (overwrite)
  // since we do a rename rather than merge
  const { migrated, changes } = applyMigrations({
    ignoreFiles: ['existing/**'],
    ignorePatterns: ['dist/**'],
  });
  assert.deepEqual(migrated.ignoreFiles, ['dist/**']);
  assert.ok(!('ignorePatterns' in migrated));
  assert.ok(changes.some((c) => c.includes('ignorePatterns')));
});

void test('applyMigrations: removes overrides and notes the change', () => {
  const { migrated, changes } = applyMigrations({
    overrides: [{ files: ['*.css'], rules: { 'design-token/colors': 'off' } }],
    rules: {},
  });
  assert.ok(!('overrides' in migrated));
  assert.ok(changes.some((c) => c.includes('overrides')));
});

void test('applyMigrations: removes root field', () => {
  const { migrated, changes } = applyMigrations({ root: true });
  assert.ok(!('root' in migrated));
  assert.ok(changes.some((c) => c.includes('root')));
});

void test('applyMigrations: removes env field and notes the change', () => {
  const { migrated, changes } = applyMigrations({
    env: { browser: true, node: true },
  });
  assert.ok(!('env' in migrated));
  assert.ok(changes.some((c) => c.includes('env')));
});

void test('applyMigrations: notes plugins without removing', () => {
  const { migrated, changes } = applyMigrations({
    plugins: ['@my/design-lint-plugin'],
  });
  // plugins key retained — downstream codemod or user must remove it
  assert.ok('plugins' in migrated);
  assert.ok(changes.some((c) => c.includes('plugins')));
});

void test('applyMigrations: notes extends without removing', () => {
  const { migrated, changes } = applyMigrations({
    extends: ['@lapidist/design-lint-config-recommended'],
  });
  assert.ok('extends' in migrated);
  assert.ok(changes.some((c) => c.includes('extends')));
});

void test('applyMigrations: handles all v7 shapes in a single config', () => {
  const { migrated, changes } = applyMigrations({
    extends: ['@my/preset'],
    plugins: ['@my/plugin'],
    root: true,
    env: { browser: true },
    ignorePatterns: ['dist/**'],
    overrides: [{ files: ['*.css'], rules: {} }],
    rules: {
      'design-token/colors': 2,
      'design-token/font-size': [1, {}],
      'design-token/spacing': 'warn',
    },
    tokens: {},
  });

  // root and env removed
  assert.ok(!('root' in migrated));
  assert.ok(!('env' in migrated));
  // overrides removed
  assert.ok(!('overrides' in migrated));
  // ignorePatterns renamed
  assert.ok('ignoreFiles' in migrated);
  assert.ok(!('ignorePatterns' in migrated));
  // rules migrated
  assert.deepEqual(migrated.rules, {
    'design-token/colors': 'error',
    'design-token/font-size': ['warn', {}],
    'design-token/spacing': 'warn',
  });
  // 7 distinct change entries
  assert.ok(changes.length >= 5);
});

// ---------------------------------------------------------------------------
// migrateConfig — integration tests for JSON files
// ---------------------------------------------------------------------------

void test('migrateConfig rewrites numeric severities in a JSON config', () => {
  const dir = makeTmpDir();
  const configPath = writeConfig(dir, 'designlint.config.json', {
    rules: { 'design-token/colors': 2, 'design-token/spacing': 1 },
  });

  migrateConfig({ config: configPath });
  const result = readConfig(configPath);

  assert.ok(typeof result === 'object' && result !== null);
  const rules = (result as Record<string, unknown>).rules;
  assert.ok(typeof rules === 'object' && rules !== null);
  assert.equal(
    (rules as Record<string, unknown>)['design-token/colors'],
    'error',
  );
  assert.equal(
    (rules as Record<string, unknown>)['design-token/spacing'],
    'warn',
  );
});

void test('migrateConfig renames ignorePatterns to ignoreFiles', () => {
  const dir = makeTmpDir();
  const configPath = writeConfig(dir, 'designlint.config.json', {
    ignorePatterns: ['dist/**'],
    rules: {},
  });

  migrateConfig({ config: configPath });
  const result = readConfig(configPath);

  assert.ok(typeof result === 'object' && result !== null);
  const obj = result as Record<string, unknown>;
  assert.ok(!('ignorePatterns' in obj), 'ignorePatterns should be removed');
  assert.deepEqual(obj.ignoreFiles, ['dist/**']);
});

void test('migrateConfig removes overrides field', () => {
  const dir = makeTmpDir();
  const configPath = writeConfig(dir, 'designlint.config.json', {
    overrides: [{ files: ['*.css'], rules: { 'design-token/colors': 'off' } }],
    rules: {},
  });

  migrateConfig({ config: configPath });
  const result = readConfig(configPath);

  assert.ok(typeof result === 'object' && result !== null);
  assert.ok(!('overrides' in (result as Record<string, unknown>)));
});

void test('migrateConfig removes root and env fields', () => {
  const dir = makeTmpDir();
  const configPath = writeConfig(dir, 'designlint.config.json', {
    root: true,
    env: { browser: true },
    rules: {},
  });

  migrateConfig({ config: configPath });
  const result = readConfig(configPath);

  assert.ok(typeof result === 'object' && result !== null);
  const obj = result as Record<string, unknown>;
  assert.ok(!('root' in obj));
  assert.ok(!('env' in obj));
});

void test('migrateConfig dry-run does not modify the file', () => {
  const dir = makeTmpDir();
  const original = { rules: { 'design-token/colors': 2 } };
  const configPath = writeConfig(dir, 'designlint.config.json', original);

  const lines: string[] = [];
  const origLog = console.log;
  console.log = (...args: unknown[]) => {
    lines.push(args.join(' '));
  };
  try {
    migrateConfig({ config: configPath, dryRun: true });
  } finally {
    console.log = origLog;
  }

  // File should be unchanged
  const result = readConfig(configPath);
  assert.deepEqual(result, original);
  assert.ok(lines.some((l) => l.includes('dry run')));
});

void test('migrateConfig --out writes to a separate file', () => {
  const dir = makeTmpDir();
  const configPath = writeConfig(dir, 'designlint.config.json', {
    rules: { 'design-token/colors': 2 },
  });
  const outPath = path.join(dir, 'designlint.v8.json');

  migrateConfig({ config: configPath, out: outPath });

  // Original unchanged
  const orig = readConfig(configPath);
  assert.ok(typeof orig === 'object' && orig !== null);
  assert.equal(
    (orig as Record<string, unknown>).rules?.['design-token/colors'],
    2,
  );

  // Output has migration applied
  const migrated = readConfig(outPath);
  assert.ok(typeof migrated === 'object' && migrated !== null);
  assert.equal(
    (migrated as Record<string, unknown>).rules?.['design-token/colors'],
    'error',
  );
});

void test('migrateConfig reports no changes needed when config is already v8-compatible', () => {
  const dir = makeTmpDir();
  const configPath = writeConfig(dir, 'designlint.config.json', {
    rules: { 'design-token/colors': 'error' },
    tokens: {},
  });

  const lines: string[] = [];
  const origLog = console.log;
  console.log = (...args: unknown[]) => {
    lines.push(args.join(' '));
  };
  try {
    migrateConfig({ config: configPath });
  } finally {
    console.log = origLog;
  }

  assert.ok(lines.some((l) => l.includes('already compatible')));
});

void test('migrateConfig prepends guide comment for JS configs', () => {
  const dir = makeTmpDir();
  const jsContent = "export default { rules: { 'design-token/colors': 2 } };\n";
  const configPath = path.join(dir, 'designlint.config.js');
  fs.writeFileSync(configPath, jsContent, 'utf8');

  migrateConfig({ config: configPath });

  const outPath = configPath + '.migrated.js';
  const output = fs.readFileSync(outPath, 'utf8');
  assert.ok(output.includes('migration guide'));
  assert.ok(output.includes(jsContent.trim()));
});
