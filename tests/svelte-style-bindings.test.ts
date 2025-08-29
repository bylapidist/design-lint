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
  for (const file of ['App.svelte', 'Directive.svelte']) {
    const res = await lint(file);
    assert(
      res.messages.some((m) => m.ruleId === 'design-token/spacing'),
      `expected spacing violation from style binding in ${file}`,
    );
    assert(
      res.messages.some((m) => m.ruleId === 'design-token/colors'),
      `expected color violation from style binding in ${file}`,
    );
  }
});
