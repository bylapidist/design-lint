import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createLinter as initLinter } from '../src/index.js';
import { FileSource } from '../src/adapters/node/file-source.js';
import { createFileDocument } from '../src/adapters/node/file-document.js';
import { loadConfig } from '../src/config/loader.js';
import type { DocumentSource, LintDocument } from '../src/core/environment.js';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
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
  const file = path.join(fixtureDir, 'src', 'App.svelte');
  const permissionError = new Error('Permission denied');
  const doc: LintDocument = {
    id: file,
    type: 'svelte',
    async getText() {
      throw permissionError;
    },
  };
  const documentSource: DocumentSource = {
    async scan() {
      return { documents: [doc], ignoreFiles: [] };
    },
  };
  const linter = initLinter(config, documentSource);
  const res = await linter.lintDocument(doc);
  assert.equal(res.messages.length, 1);
  const msg = res.messages[0];
  assert.equal(msg.ruleId, 'parse-error');
  assert.match(msg.message, /permission denied/i);
});

void test('lintTargets reports unreadable file', async () => {
  const config = await loadConfig(fixtureDir);
  const file = path.join(fixtureDir, 'src', 'App.svelte');
  const permissionError = new Error('Permission denied');
  const doc: LintDocument = {
    id: file,
    type: 'svelte',
    async getText() {
      throw permissionError;
    },
  };
  const documentSource: DocumentSource = {
    async scan() {
      return { documents: [doc], ignoreFiles: [] };
    },
  };
  const linter = initLinter(config, documentSource);
  const { results } = await linter.lintTargets([file]);
  const res = results[0];
  assert.equal(res.messages.length, 1);
  const msg = res.messages[0];
  assert.equal(msg.ruleId, 'parse-error');
  assert.match(msg.message, /permission denied/i);
});
