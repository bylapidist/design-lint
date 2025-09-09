import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const tsxLoader = createRequire(import.meta.url).resolve('tsx/esm');
const __dirname = fileURLToPath(new URL('.', import.meta.url));

void test('CLI loads nearest config in nested project', () => {
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
    ['--import', tsxLoader, cli, '.', '--format', 'json'],
    { cwd: appDir, encoding: 'utf8' },
  );
  assert.notEqual(res.status, 0);
  interface Result {
    sourceId: string;
    messages: { ruleId: string }[];
  }
  const parsed = JSON.parse(res.stdout) as unknown;
  assert(Array.isArray(parsed));
  const results = parsed as Result[];
  const files = results.map((r) => path.relative(appDir, r.sourceId)).sort();
  assert.deepEqual(files, ['src/App.module.css', 'src/App.tsx']);
  for (const r of results) {
    for (const m of r.messages) {
      assert.equal(m.ruleId, 'design-token/colors');
    }
  }
});
