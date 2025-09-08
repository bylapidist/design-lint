import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { Linter } from '../src/node-adapter/linter.ts';
import { FileSource } from '../src/node-adapter/file-source.ts';
import { loadConfig } from '../src/config/loader.ts';

const fixtureDir = path.join(__dirname, 'fixtures', 'svelte');

void test('lintFile delegates to lintFiles', async () => {
  const config = await loadConfig(fixtureDir);
  const linter = new Linter(config, new FileSource());
  const file = path.join(fixtureDir, 'src', 'App.svelte');
  const res1 = await linter.lintFile(file);
  const { results: res2 } = await linter.lintFiles([file]);
  assert.deepEqual(res1, res2[0]);
});

void test('lintFile reports unreadable file', async () => {
  const config = await loadConfig(fixtureDir);
  const linter = new Linter(config, new FileSource());
  const file = path.join(fixtureDir, 'src', 'App.svelte');
  const original = fs.readFile;
  const stub = mock.method(
    fs,
    'readFile',
    async (...args: Parameters<typeof fs.readFile>) => {
      const [p] = args;
      if (p === file) {
        throw new Error('Permission denied');
      }
      return original(...args);
    },
  );
  try {
    const res = await linter.lintFile(file);
    assert.equal(res.messages.length, 1);
    const msg = res.messages[0];
    assert.equal(msg.ruleId, 'parse-error');
    assert.match(msg.message, /permission denied/i);
  } finally {
    stub.mock.restore();
  }
});

void test('lintFiles reports unreadable file', async () => {
  const config = await loadConfig(fixtureDir);
  const linter = new Linter(config, new FileSource());
  const file = path.join(fixtureDir, 'src', 'App.svelte');
  const original = fs.readFile;
  const stub = mock.method(
    fs,
    'readFile',
    async (...args: Parameters<typeof fs.readFile>) => {
      const [p] = args;
      if (p === file) {
        throw new Error('Permission denied');
      }
      return original(...args);
    },
  );
  try {
    const { results } = await linter.lintFiles([file]);
    const res = results[0];
    assert.equal(res.messages.length, 1);
    const msg = res.messages[0];
    assert.equal(msg.ruleId, 'parse-error');
    assert.match(msg.message, /permission denied/i);
  } finally {
    stub.mock.restore();
  }
});
