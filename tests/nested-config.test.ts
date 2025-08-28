import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
const tsNodeRegister = require.resolve('ts-node/register');

test('CLI loads nearest config in nested project', () => {
  const appDir = path.join(
    __dirname,
    'fixtures',
    'nested-config',
    'packages',
    'app',
  );
  const cli = path.join(__dirname, '..', 'src', 'cli', 'index.ts');
  const res = spawnSync(
    process.execPath,
    ['--require', tsNodeRegister, cli, '.', '--format', 'json'],
    { cwd: appDir, encoding: 'utf8' },
  );
  assert.notEqual(res.status, 0);
  interface Result {
    filePath: string;
    messages: { ruleId: string }[];
  }
  const parsed: Result[] = JSON.parse(res.stdout);
  const files = parsed.map((r) => path.relative(appDir, r.filePath)).sort();
  assert.deepEqual(files, ['src/App.module.css', 'src/App.tsx']);
  for (const r of parsed) {
    for (const m of r.messages) {
      assert.equal(m.ruleId, 'design-token/colors');
    }
  }
});
