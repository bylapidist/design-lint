/**
 * Tests for the `design-lint validate` command.
 *
 * Calls `validateConfig` directly — no subprocess spawning.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { validateConfig } from '../../src/cli/validate-config.js';
import type { Logger } from '../../src/cli/logger.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
  const dir = path.join(
    tmpdir(),
    `dl-validate-${Date.now().toString()}-${Math.random().toString(36).slice(2)}`,
  );
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function stubLogger(): Logger & { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  return {
    errors,
    warnings,
    error(err: unknown) {
      errors.push(err instanceof Error ? err.message : String(err));
    },
    warn(msg: string) {
      warnings.push(msg);
    },
  };
}

function makeValidTokensFile(dir: string): string {
  const tokensPath = path.join(dir, 'tokens.tokens.json');
  fs.writeFileSync(
    tokensPath,
    JSON.stringify({
      $version: '1.0.0',
      color: {
        red: {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [1, 0, 0] },
        },
      },
    }),
  );
  return tokensPath;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

void test('validateConfig accepts a valid configuration', async () => {
  const dir = makeTmpDir();
  makeValidTokensFile(dir);
  const configPath = path.join(dir, 'designlint.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({ tokens: { default: './tokens.tokens.json' }, rules: {} }),
  );

  const lines: string[] = [];
  const orig = console.log;
  console.log = (...args: unknown[]) => {
    lines.push(args.join(' '));
  };
  try {
    await validateConfig({ config: configPath }, stubLogger());
  } finally {
    console.log = orig;
  }
  assert.ok(lines.some((l) => l.includes('Configuration is valid')));
});

void test('validateConfig throws on invalid tokens (missing $value)', async () => {
  const dir = makeTmpDir();
  const tokensPath = path.join(dir, 'tokens.tokens.json');
  fs.writeFileSync(
    tokensPath,
    JSON.stringify({ $version: '1.0.0', color: { bad: { $type: 'color' } } }),
  );
  const configPath = path.join(dir, 'designlint.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({ tokens: { default: './tokens.tokens.json' }, rules: {} }),
  );

  await assert.rejects(
    () => validateConfig({ config: configPath }, stubLogger()),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(
        err.message.includes('Failed to parse DTIF document') ||
          err.message.includes('Schema violation'),
      );
      return true;
    },
  );
});

void test('validateConfig throws on unresolved circular aliases', async () => {
  const dir = makeTmpDir();
  const tokensPath = path.join(dir, 'tokens.tokens.json');
  fs.writeFileSync(
    tokensPath,
    JSON.stringify({
      $version: '1.0.0',
      color: {
        red: { $type: 'color', $ref: '#/color/green' },
        green: { $type: 'color', $ref: '#/color/red' },
      },
    }),
  );
  const configPath = path.join(dir, 'designlint.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({ tokens: { default: './tokens.tokens.json' }, rules: {} }),
  );

  await assert.rejects(
    () => validateConfig({ config: configPath }, stubLogger()),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      return true;
    },
  );
});

void test('validateConfig throws on unknown rules', async () => {
  const dir = makeTmpDir();
  const configPath = path.join(dir, 'designlint.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({
      tokens: {},
      rules: { 'design-token/not-a-rule': 'error' },
    }),
  );

  await assert.rejects(
    () => validateConfig({ config: configPath }, stubLogger()),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes('Unknown rule'));
      return true;
    },
  );
});

void test('validateConfig throws on invalid rule options', async () => {
  const dir = makeTmpDir();
  const configPath = path.join(dir, 'designlint.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({
      tokens: {},
      rules: { 'design-system/no-unused-tokens': ['error', { ignore: 1 }] },
    }),
  );

  await assert.rejects(
    () => validateConfig({ config: configPath }, stubLogger()),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(
        err.message.includes('Invalid options') ||
          err.message.includes('no-unused-tokens'),
      );
      return true;
    },
  );
});

void test('validateConfig throws on unknown formatter', async () => {
  const dir = makeTmpDir();
  const configPath = path.join(dir, 'designlint.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({ tokens: {}, rules: {}, format: 'not-a-real-formatter' }),
  );

  await assert.rejects(
    () => validateConfig({ config: configPath }, stubLogger()),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes('Unknown formatter'));
      return true;
    },
  );
});
