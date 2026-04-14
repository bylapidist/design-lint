/**
 * Tests for CLI error-handling behaviour.
 *
 * Calls CLI functions directly — no subprocess spawning.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { exportTokens } from '../../src/cli/tokens.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
  return mkdtempSync(path.join(tmpdir(), 'designlint-'));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

void test('reports config errors on invalid tokens shape', async () => {
  const dir = makeTmpDir();
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({ tokens: 5, rules: {} }),
  );

  await assert.rejects(
    () => exportTokens({ config: path.join(dir, 'designlint.config.json') }),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      return true;
    },
  );
});

void test('fails on unresolved aliases', async () => {
  const dir = makeTmpDir();
  fs.writeFileSync(
    path.join(dir, 'tokens.tokens.json'),
    JSON.stringify({
      $version: '1.0.0',
      color: {
        red: {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [1, 0, 0] },
        },
        bad1: { $type: 'color', $ref: '#/color/missing' },
        bad2: { $type: 'color', $ref: '#/color/missing' },
      },
    }),
  );
  fs.writeFileSync(
    path.join(dir, 'designlint.config.json'),
    JSON.stringify({
      tokens: { default: './tokens.tokens.json' },
      rules: {},
    }),
  );

  await assert.rejects(
    () => exportTokens({ config: path.join(dir, 'designlint.config.json') }),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(
        err.message.includes('Failed to parse DTIF document') ||
          err.message.includes('unresolved') ||
          err.message.includes('alias') ||
          err.message.includes('missing'),
        `Unexpected error message: ${String(err instanceof Error ? err.message : err)}`,
      );
      return true;
    },
  );
});
