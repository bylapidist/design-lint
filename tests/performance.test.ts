import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeTmpDir } from '../src/utils/tmp';
import path from 'node:path';
import { loadConfig } from '../src/config/loader';
import { Linter } from '../src/core/engine';

test('lints large projects without crashing', async () => {
  const dir = path.join(__dirname, 'fixtures', 'large-project');
  const config = await loadConfig(dir);
  const linter = new Linter(config);
  const { results } = await linter.lintFiles([dir]);
  assert.equal(results.length, 200);
});

test('lints very large projects without EMFILE', async () => {
  const tmp = makeTmpDir();
  fs.writeFileSync(path.join(tmp, 'designlint.config.json'), '{}');
  const count = 2000;
  for (let i = 0; i < count; i++) {
    fs.writeFileSync(path.join(tmp, `file${i}.ts`), 'export const x = 1;\n');
  }
  const config = await loadConfig(tmp);
  const linter = new Linter(config);
  const { results } = await linter.lintFiles([tmp]);
  assert.equal(results.length, count);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('respects configured concurrency limit', async () => {
  const tmp = makeTmpDir();
  fs.writeFileSync(
    path.join(tmp, 'designlint.config.json'),
    JSON.stringify({ concurrency: 2 }),
  );
  const count = 10;
  for (let i = 0; i < count; i++) {
    fs.writeFileSync(path.join(tmp, `file${i}.ts`), 'export const x = 1;\n');
  }
  const fsp = fs.promises;
  const origRead = fsp.readFile;
  const origStat = fsp.stat;
  let active = 0;
  let max = 0;
  const delay = () => new Promise((r) => setTimeout(r, 10));
  fsp.readFile = (async (...args: Parameters<typeof origRead>) => {
    active++;
    max = Math.max(max, active);
    await delay();
    try {
      return await origRead(...args);
    } finally {
      active--;
    }
  }) as typeof origRead;
  fsp.stat = (async (...args: Parameters<typeof origStat>) => {
    active++;
    max = Math.max(max, active);
    await delay();
    try {
      return await origStat(...args);
    } finally {
      active--;
    }
  }) as typeof origStat;

  const config = await loadConfig(tmp);
  const linter = new Linter(config);
  const { results } = await linter.lintFiles([tmp]);
  assert.equal(results.length, count);
  assert.ok(max <= 2);
  fsp.readFile = origRead;
  fsp.stat = origStat;
  fs.rmSync(tmp, { recursive: true, force: true });
});
