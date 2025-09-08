import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeTmpDir } from '../src/utils/tmp.ts';
import path from 'node:path';
import { loadConfig } from '../src/index.ts';
import { Linter } from '../src/index.ts';
import { FileSource } from '../src/index.ts';

void test('lints large projects without crashing', async () => {
  const dir = path.join(__dirname, 'fixtures', 'large-project');
  const config = await loadConfig(dir);
  const linter = new Linter(config, new FileSource());
  const { results } = await linter.lintFiles([dir]);
  assert.equal(results.length, 200);
});

void test('lints very large projects without EMFILE', async () => {
  const tmp = makeTmpDir();
  fs.writeFileSync(path.join(tmp, 'designlint.config.json'), '{}');
  const count = 2000;
  for (let i = 0; i < count; i++) {
    fs.writeFileSync(
      path.join(tmp, `file${String(i)}.ts`),
      'export const x = 1;\n',
    );
  }
  const config = await loadConfig(tmp);
  const linter = new Linter(config, new FileSource());
  const { results } = await linter.lintFiles([tmp]);
  assert.equal(results.length, count);
  fs.rmSync(tmp, { recursive: true, force: true });
});

void test('respects configured concurrency limit', async () => {
  const tmp = makeTmpDir();
  fs.writeFileSync(
    path.join(tmp, 'designlint.config.json'),
    JSON.stringify({ concurrency: 2 }),
  );
  const count = 10;
  for (let i = 0; i < count; i++) {
    fs.writeFileSync(
      path.join(tmp, `file${String(i)}.ts`),
      'export const x = 1;\n',
    );
  }
  const fsp = fs.promises;
  const origRead = fsp.readFile;
  const origStat = fsp.stat;
  let active = 0;
  let max = 0;
  const delay = () => new Promise((r) => setTimeout(r, 10));
  const trackedRead: typeof origRead = async (...args) => {
    active++;
    max = Math.max(max, active);
    await delay();
    try {
      return await origRead(...args);
    } finally {
      active--;
    }
  };
  const trackedStat: typeof origStat = async (...args) => {
    active++;
    max = Math.max(max, active);
    await delay();
    try {
      return await origStat(...args);
    } finally {
      active--;
    }
  };
  fsp.readFile = trackedRead;
  fsp.stat = trackedStat;

  const config = await loadConfig(tmp);
  const linter = new Linter(config, new FileSource());
  const { results } = await linter.lintFiles([tmp]);
  assert.equal(results.length, count);
  assert.ok(max <= 2);
  fsp.readFile = origRead;
  fsp.stat = origStat;
  fs.rmSync(tmp, { recursive: true, force: true });
});
