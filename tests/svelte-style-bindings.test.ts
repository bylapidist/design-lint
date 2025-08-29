import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { Linter } from '../src/core/engine';
import { loadConfig } from '../src/config/loader';

const fixtureDir = path.join(__dirname, 'fixtures', 'svelte');

async function lint(file: string) {
  const config = await loadConfig(fixtureDir);
  const linter = new Linter(config);
  return linter.lintFile(path.join(fixtureDir, 'src', file));
}

test('style bindings report spacing and color violations', async () => {
  const res = await lint('App.svelte');
  const spacing = res.messages.find(
    (m) => m.ruleId === 'design-token/spacing' && m.line === 16,
  );
  assert(spacing, 'expected spacing violation from style binding');
  const color = res.messages.find(
    (m) => m.ruleId === 'design-token/colors' && m.line === 16,
  );
  assert(color, 'expected color violation from style binding');
});
