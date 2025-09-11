import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { createLinter as initLinter } from '../src/index.ts';
import { FileSource } from '../src/adapters/node/file-source.ts';
import { createFileDocument } from '../src/adapters/node/file-document.ts';
import { loadConfig } from '../src/config/loader.ts';

const fixtureDir = path.join(__dirname, 'fixtures', 'svelte');

void test('lintDocument matches lintTargets result', async () => {
  const config = await loadConfig(fixtureDir);
  const linter = initLinter(config, { documentSource: new FileSource() });
  const file = path.join(fixtureDir, 'src', 'App.svelte');
  const doc = createFileDocument(file);
  const res1 = await linter.lintDocument(doc);
  const { results } = await linter.lintTargets([file]);
  const [res2] = results;
  assert.deepEqual(res1, res2);
});

void test('lintDocument reports unreadable file', async () => {
  const config = await loadConfig(fixtureDir);
  const linter = initLinter(config, { documentSource: new FileSource() });
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

void test('lintTargets reports unreadable file', async () => {
  const config = await loadConfig(fixtureDir);
  const linter = initLinter(config, { documentSource: new FileSource() });
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
    const { results } = await linter.lintTargets([file]);
    const res = results[0];
    assert.equal(res.messages.length, 1);
    const msg = res.messages[0];
    assert.equal(msg.ruleId, 'parse-error');
    assert.match(msg.message, /permission denied/i);
  } finally {
    stub.mock.restore();
  }
});
