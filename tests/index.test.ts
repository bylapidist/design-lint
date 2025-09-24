/**
 * Tests for the top-level module exports.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createLintService,
  builtInRules,
  type Config,
  type DocumentSource,
  type Environment,
} from '../src/index.js';

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
