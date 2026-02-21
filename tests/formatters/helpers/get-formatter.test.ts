/**
 * Unit tests for {@link getFormatter} helper.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { helpers, jsonFormatter } from '../../../src/formatters/index.js';

const { getFormatter } = helpers;

void test('getFormatter returns formatter for valid name', async () => {
  assert.equal(await getFormatter('json'), jsonFormatter);
});

void test('getFormatter resolves formatter relative to cwd', async () => {
  const __dirname = fileURLToPath(new URL('.', import.meta.url));
  const fixtureDir = join(__dirname, 'fixtures');
  const prev = process.cwd();
  process.chdir(fixtureDir);
  try {
    const formatter = await getFormatter('./custom-formatter.ts');
    const out = formatter([{ sourceId: 'a', messages: [] }]);
    assert.equal(out, 'custom:1');
  } finally {
    process.chdir(prev);
  }
});

void test('getFormatter resolves formatter by absolute path', async () => {
  const __dirname = fileURLToPath(new URL('.', import.meta.url));
  const fixtureDir = join(__dirname, 'fixtures');
  const abs = join(fixtureDir, 'custom-formatter.ts');
  const formatter = await getFormatter(abs);
  const out = formatter([{ sourceId: 'a', messages: [] }]);
  assert.equal(out, 'custom:1');
});

void test('getFormatter resolves named formatter export', async () => {
  const __dirname = fileURLToPath(new URL('.', import.meta.url));
  const fixtureDir = join(__dirname, 'fixtures');
  const prev = process.cwd();
  process.chdir(fixtureDir);
  try {
    const formatter = await getFormatter('./named-formatter.ts');
    const out = formatter([{ sourceId: 'a', messages: [] }]);
    assert.equal(out, 'named:1');
  } finally {
    process.chdir(prev);
  }
});

void test('getFormatter throws unknown formatter for missing module', async () => {
  await assert.rejects(
    () => getFormatter('unknown'),
    /Unknown formatter: unknown/,
  );
});

void test('getFormatter throws for module with invalid formatter export', async () => {
  const __dirname = fileURLToPath(new URL('.', import.meta.url));
  const fixtureDir = join(__dirname, 'fixtures');
  const prev = process.cwd();
  process.chdir(fixtureDir);
  try {
    await assert.rejects(
      () => getFormatter('./invalid-formatter.ts'),
      /does not export a valid formatter function/,
    );
  } finally {
    process.chdir(prev);
  }
});

void test('getFormatter preserves import-time module error details', async () => {
  const __dirname = fileURLToPath(new URL('.', import.meta.url));
  const fixtureDir = join(__dirname, 'fixtures');
  const prev = process.cwd();
  process.chdir(fixtureDir);
  try {
    await assert.rejects(
      () => getFormatter('./throwing-formatter.ts'),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.match(
          error.message,
          /Failed to load formatter "\.\/throwing-formatter\.ts": fixture import failure/,
        );
        assert.match(
          error.stack ?? '',
          /getFormatter|Failed to load formatter/,
        );
        assert.match(error.stack ?? '', /fixture import failure/);
        return true;
      },
    );
  } finally {
    process.chdir(prev);
  }
});

void test('getFormatter emits a security warning for custom formatter modules', async (t) => {
  const __dirname = fileURLToPath(new URL('.', import.meta.url));
  const fixtureDir = join(__dirname, 'fixtures');
  const warnedKey = Symbol.for('design-lint.warned.untrusted-formatter-loader');
  Reflect.set(globalThis, warnedKey, false);

  const warnings: unknown[] = [];
  const emitWarningMock = t.mock.method(
    process,
    'emitWarning',
    (...args: unknown[]) => {
      warnings.push(args);
    },
  );

  const prev = process.cwd();
  process.chdir(fixtureDir);
  try {
    await getFormatter('./custom-formatter.ts');
  } finally {
    process.chdir(prev);
  }

  assert.equal(warnings.length, 1);
  assert.match(
    String(warnings[0]?.[0] ?? ''),
    /Only load trusted formatter modules/,
  );

  emitWarningMock.mock.restore();
  Reflect.set(globalThis, warnedKey, false);
});
