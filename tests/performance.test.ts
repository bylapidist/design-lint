import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadConfig } from '../src/config/loader';
import { Linter } from '../src/core/engine';

test('lints large projects without crashing', async () => {
  const dir = path.join(__dirname, 'fixtures', 'large-project');
  const config = await loadConfig(dir);
  const linter = new Linter(config);
  const results = await linter.lintFiles([dir]);
  assert.equal(results.length, 200);
});

test('lints very large projects without EMFILE', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'designlint-'));
  fs.writeFileSync(path.join(tmp, 'designlint.config.json'), '{}');
  const count = 2000;
  for (let i = 0; i < count; i++) {
    fs.writeFileSync(path.join(tmp, `file${i}.ts`), 'export const x = 1;\n');
  }
  const config = await loadConfig(tmp);
  const linter = new Linter(config);
  const results = await linter.lintFiles([tmp]);
  assert.equal(results.length, count);
  fs.rmSync(tmp, { recursive: true, force: true });
});
