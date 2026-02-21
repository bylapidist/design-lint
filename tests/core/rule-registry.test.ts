import test from 'node:test';
import assert from 'node:assert/strict';
import { RuleRegistry } from '../../src/core/rule-registry.js';
import type { Config } from '../../src/core/linter.js';
import { ConfigError } from '../../src/core/errors.js';

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

void test('RuleRegistry accepts no-unused-tokens ignore options', async () => {
  const config: Config = {
    tokens: {},
    rules: {
      'design-system/no-unused-tokens': ['warn', { ignore: ['#123456'] }],
    },
  };
  const registry = new RuleRegistry(config);
  await registry.load();

  assert.doesNotThrow(() => registry.getEnabledRules());
});

void test('RuleRegistry rejects malformed no-unused-tokens options', async () => {
  const config: Config = {
    tokens: {},
    rules: {
      'design-system/no-unused-tokens': ['warn', { ignore: [123] }],
    },
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

void test('RuleRegistry rejects invalid scalar rule severity', async () => {
  const config: Config = {
    tokens: {},
    rules: {
      'design-token/colors': 'fatal',
    },
  };
  const registry = new RuleRegistry(config);
  await registry.load();

  assert.throws(
    () => registry.getEnabledRules(),
    (err) => {
      if (err instanceof ConfigError) {
        return err.message.includes('Invalid severity');
      }
      return false;
    },
  );
});

void test('RuleRegistry rejects invalid tuple rule severity', async () => {
  const config: Config = {
    tokens: {},
    rules: {
      'design-system/component-prefix': ['fatal', { prefix: 'DS' }],
    },
  };
  const registry = new RuleRegistry(config);
  await registry.load();

  assert.throws(
    () => registry.getEnabledRules(),
    (err) => {
      if (err instanceof ConfigError) {
        return err.message.includes('Invalid severity');
      }
      return false;
    },
  );
});
