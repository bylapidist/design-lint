import test from 'node:test';
import assert from 'node:assert/strict';
import { RuleRegistry } from '../../src/engine/rule-registry.ts';
import type { Config } from '../../src/node-adapter/linter.ts';

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
