import test from 'node:test';
import assert from 'node:assert/strict';
import { RuleRegistry } from '../../src/core/rule-registry.ts';
import type { Config } from '../../src/core/linter.ts';
import { ConfigError } from '../../src/core/errors.ts';

void test('RuleRegistry enables configured rules', async () => {
  const config: Config = {
    tokens: {},
    rules: { 'design-token/colors': 'warn' },
  };
  const registry = new RuleRegistry(config);
  await registry.load();
  const enabled = registry.getEnabledRules();
  assert.equal(enabled.length, 1);
  assert.equal(enabled[0].rule.name, 'design-token/colors');
  assert.equal(enabled[0].severity, 'warn');
});

void test('RuleRegistry validates rule options', async () => {
  const config: Config = {
    tokens: {},
    rules: { 'design-system/component-prefix': ['error', { prefix: 123 }] },
  };
  const registry = new RuleRegistry(config);
  await registry.load();
  assert.throws(
    () => registry.getEnabledRules(),
    (err) => {
      if (err instanceof ConfigError) {
        return err.message.includes('Invalid options');
      }
      return false;
    },
  );
});
