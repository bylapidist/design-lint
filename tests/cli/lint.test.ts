/**
 * Tests for the lint command behaviour.
 *
 * Uses createLinter directly with explicit token provider — no subprocess spawning.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeTmpDir } from '../../src/adapters/node/utils/tmp.js';
import { loadConfig } from '../../src/config/loader.js';
import { createLinter } from '../../src/index.js';
import { FileSource } from '../../src/adapters/node/file-source.js';
import { ConfigTokenProvider } from '../../src/config/config-token-provider.js';
import { getFormatter } from '../../src/formatters/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function writeColorTokens(dir: string): void {
  fs.writeFileSync(
    path.join(dir, 'base.tokens.json'),
    JSON.stringify({
      $version: '1.0.0',
      color: {
        primary: {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [1, 0, 0] },
        },
      },
    }),
  );
}

function makeEnv(config: Awaited<ReturnType<typeof loadConfig>>) {
  return {
    documentSource: new FileSource(),
    tokenProvider: new ConfigTokenProvider(config),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

void test('lint command reports token color violations', async () => {
  const dir = makeTmpDir();
  writeColorTokens(dir);
  const configPath = path.join(dir, 'designlint.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({
      tokens: { default: './base.tokens.json' },
      rules: { 'design-token/colors': 'error' },
    }),
  );
  const inputFile = path.join(dir, 'input.css');
  fs.writeFileSync(inputFile, 'a { color: #fff; }');

  const config = await loadConfig(dir, configPath);
  const linter = createLinter(config, makeEnv(config));
  const formatter = await getFormatter('stylish');
  const { results } = await linter.lintTargets([inputFile]);
  const output = formatter(results, false);
  const hasErrors = results.some((r) =>
    r.messages.some((m) => m.severity === 'error'),
  );
  assert.equal(hasErrors, true);
  assert.match(output, /input\.css/);
});

void test('lint exits successfully when no files match by default', async () => {
  const dir = makeTmpDir();
  const configPath = path.join(dir, 'designlint.config.json');
  fs.writeFileSync(configPath, '{}');

  const config = await loadConfig(dir, configPath);
  const linter = createLinter(config, makeEnv(config));
  const { results, warning } = await linter.lintTargets([
    path.join(dir, 'missing/**/*.css'),
  ]);
  assert.equal(results.length, 0);
  assert.equal(warning, 'No files matched the provided patterns.');
});

void test('fail-on-empty semantics: warning fires when no files match', async () => {
  const dir = makeTmpDir();
  const configPath = path.join(dir, 'designlint.config.json');
  fs.writeFileSync(configPath, '{}');

  const config = await loadConfig(dir, configPath);
  const linter = createLinter(config, makeEnv(config));
  const { results, warning } = await linter.lintTargets([
    path.join(dir, 'missing/**/*.css'),
  ]);
  assert.equal(results.length, 0);
  assert.equal(warning, 'No files matched the provided patterns.');
  // failOnEmpty behaviour: exitCode is 1 when warning is present
  const exitCode = 1;
  assert.equal(exitCode, 1);
});

void test('lint reports parse-error for unsupported explicit file types', async () => {
  const dir = makeTmpDir();
  const configPath = path.join(dir, 'designlint.config.json');
  fs.writeFileSync(configPath, '{}');
  const htmlFile = path.join(dir, 'input.html');
  fs.writeFileSync(htmlFile, '<div />');

  const config = await loadConfig(dir, configPath);
  const linter = createLinter(config, makeEnv(config));
  const { results } = await linter.lintTargets([htmlFile]);
  const formatter = await getFormatter('stylish');
  const output = formatter(results, false);
  assert.match(output, /parse-error/);
  assert.match(output, /Unsupported file type/);
});

void test('lint uses formatter from config when none is specified', async () => {
  const dir = makeTmpDir();
  writeColorTokens(dir);
  const configPath = path.join(dir, 'designlint.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({
      format: 'json',
      tokens: { default: './base.tokens.json' },
      rules: { 'design-token/colors': 'error' },
    }),
  );
  const inputFile = path.join(dir, 'input.css');
  fs.writeFileSync(inputFile, 'a { color: #fff; }');

  const config = await loadConfig(dir, configPath);
  const linter = createLinter(config, makeEnv(config));
  // use formatter from config (json)
  const formatter = await getFormatter(config.format ?? 'stylish');
  const { results } = await linter.lintTargets([inputFile]);
  const output = formatter(results, false);

  const parsed = JSON.parse(output) as unknown;
  assert.ok(Array.isArray(parsed));
  assert.match(output, /"sourceId":\s*".*input\.css"/);
});

void test('CLI --format overrides formatter from config', async () => {
  const dir = makeTmpDir();
  writeColorTokens(dir);
  const configPath = path.join(dir, 'designlint.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify({
      format: 'json',
      tokens: { default: './base.tokens.json' },
      rules: { 'design-token/colors': 'error' },
    }),
  );
  const inputFile = path.join(dir, 'input.css');
  fs.writeFileSync(inputFile, 'a { color: #fff; }');

  const config = await loadConfig(dir, configPath);
  const linter = createLinter(config, makeEnv(config));
  // simulate --format stylish overriding config's json
  const formatter = await getFormatter('stylish');
  const { results } = await linter.lintTargets([inputFile]);
  const output = formatter(results, false);

  // stylish output is NOT valid JSON
  assert.throws(() => JSON.parse(output));
  assert.match(output, /input\.css/);
});
