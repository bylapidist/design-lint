import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { Linter } from '../src/core/linter.ts';
import { FileSource } from '../src/node/file-source.ts';
import { createFileDocument } from '../src/node/file-document.ts';
import { loadConfig } from '../src/config/loader.ts';

const fixtureDir = path.join(__dirname, 'fixtures', 'svelte');

void test('lintDocument matches lintFile wrapper', async () => {
  const config = await loadConfig(fixtureDir);
  const linter = new Linter(config, new FileSource());
  const file = path.join(fixtureDir, 'src', 'App.svelte');
  const doc = createFileDocument(file);
  const res1 = await linter.lintDocument(doc);
  const res2 = await linter.lintFile(file);
  assert.deepEqual(res1, res2);
});

void test('lintDocument reports unreadable file', async () => {
  const config = await loadConfig(fixtureDir);
  const linter = new Linter(config, new FileSource());
  const file = path.join(fixtureDir, 'src', 'App.svelte');
  const doc = createFileDocument(file);
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
    const res = await linter.lintDocument(doc);
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
