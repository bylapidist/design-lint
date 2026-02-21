/**
 * Tests for the top-level module exports.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createLinter,
  createLintService,
  builtInRules,
  TokenRegistry,
  type Config,
  type DocumentSource,
  type Environment,
} from '../src/index.js';
import { createNodeEnvironment } from '../src/adapters/node/environment.js';

class StubDocumentSource implements DocumentSource {
  public calls: {
    targets: string[];
    config: Config;
    ignore: string[];
  }[] = [];

  scan(
    targets: string[],
    config: Config,
    additionalIgnore: string[] = [],
  ): Promise<{
    documents: [];
    ignoreFiles: string[];
    warning: string;
  }> {
    this.calls.push({ targets, config, ignore: additionalIgnore });
    return Promise.resolve({
      documents: [],
      ignoreFiles: ['.designlintignore'],
      warning: 'scan warning',
    });
  }
}

void test('builtInRules are exposed for consumers', () => {
  assert.ok(Array.isArray(builtInRules));
  assert.ok(builtInRules.length > 0);
  assert.ok(
    builtInRules.some((rule) => rule.name === 'design-token/animation'),
  );
});

void test('createLintService returns lint service configured with environment', async () => {
  const source = new StubDocumentSource();
  const env: Environment = { documentSource: source };
  const config: Config = {};
  const service = createLintService(config, env);

  const result = await service.lintTargets(['src/**/*.ts'], false, [
    'custom-ignore',
  ]);

  assert.deepEqual(result.results, []);
  assert.deepEqual(result.ignoreFiles, ['.designlintignore']);
  assert.equal(result.warning, 'scan warning');
  assert.deepEqual(source.calls, [
    {
      targets: ['src/**/*.ts'],
      config: { tokens: {} },
      ignore: ['custom-ignore'],
    },
  ]);
});

void test('createLintService accepts DocumentSource inputs directly', async () => {
  const source = new StubDocumentSource();
  const config: Config = {};
  const service = createLintService(config, source);

  await service.lintTargets(['src/**/*.ts'], false);

  assert.deepEqual(source.calls, [
    {
      targets: ['src/**/*.ts'],
      config: { tokens: {} },
      ignore: [],
    },
  ]);
});

void test('createLinter accepts DocumentSource inputs directly', async () => {
  const source = new StubDocumentSource();
  const config: Config = {};
  const linter = createLinter(config, source);
  const result = await linter.lintTargets(['src/**/*.ts']);

  assert.deepEqual(result.results, []);
});

void test('createLinter accepts Environment inputs directly', async () => {
  const source = new StubDocumentSource();
  const config: Config = {};
  const env: Environment = { documentSource: source };
  const linter = createLinter(config, env);
  const result = await linter.lintTargets(['src/**/*.ts']);

  assert.deepEqual(result.results, []);
});

void test('TokenRegistry is re-exported from top-level index', () => {
  assert.equal(typeof TokenRegistry, 'function');
});

void test('namespace export getters are reachable from top-level index', async () => {
  const mod = await import('../src/index.js');
  assert.equal(typeof mod.TokenRegistry, 'function');
  assert.equal(typeof mod.createLinter, 'function');
  assert.equal(typeof mod.createLintService, 'function');
});

void test('createLinter handles fully constructed Environment objects', async () => {
  const config: Config = {};
  const env = createNodeEnvironment(config);
  const linter = createLinter(config, env);
  const result = await linter.lintTargets(['missing/**/*.ts']);
  assert.deepEqual(result.results, []);
});
