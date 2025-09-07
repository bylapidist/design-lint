import test from 'node:test';
import assert from 'node:assert/strict';
import { RuleRegistry } from '../../src/core/rule-registry.js';

void test('enables configured rules', async () => {
  const registry = new RuleRegistry({
    rules: { 'design-system/no-inline-styles': 'warn' },
  });
  await registry.ready;
  const enabled = registry.getEnabledRules();
  assert.equal(enabled.length, 1);
  assert.equal(enabled[0].rule.name, 'design-system/no-inline-styles');
  assert.equal(enabled[0].severity, 'warn');
});
