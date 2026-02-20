import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CacheManager,
  RUNTIME_ERROR_RULE_ID,
} from '../../src/core/cache-manager.js';
import { promises as fs } from 'fs';
import os from 'node:os';
import path from 'node:path';
import type { LintDocument } from '../../src/core/environment.js';
import type { LintResult } from '../../src/core/types.js';
import { createFileDocument } from '../../src/adapters/node/file-document.js';

void test('CacheManager applies fixes when enabled', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cm-'));
  const file = path.join(dir, 'a.txt');
  await fs.writeFile(file, 'bad');
  const lintFn = (text: string, sourceId: string): Promise<LintResult> => {
    if (text === 'bad') {
      return Promise.resolve({
        sourceId,
        messages: [
          {
            ruleId: 'test',
            message: 'bad',
            severity: 'error',
            line: 1,
            column: 1,
            fix: { range: [0, 3], text: 'good' },
          },
        ],
      });
    }
    return Promise.resolve({ sourceId, messages: [] });
  };
  const manager = new CacheManager(undefined, true);
  const doc = createFileDocument(file);
  await manager.processDocument(doc, lintFn);
  const updated = await fs.readFile(file, 'utf8');
  assert.equal(updated, 'good');
});

void test('CacheManager classifies read failures as runtime errors with metadata', async () => {
  const manager = new CacheManager(undefined, false);
  const doc: LintDocument = {
    id: 'missing-file.css',
    type: 'css',
    getText() {
      return Promise.reject(new Error('EACCES: permission denied'));
    },
  };

  const result = await manager.processDocument(doc, () =>
    Promise.resolve({
      sourceId: doc.id,
      messages: [],
    }),
  );

  assert.equal(result.messages.length, 1);
  const [message] = result.messages;
  assert.equal(message.ruleId, RUNTIME_ERROR_RULE_ID);
  assert.equal(message.message, 'EACCES: permission denied');
  assert.deepEqual(message.metadata.phase, 'read');
  assert.deepEqual(message.metadata.errorMessage, 'EACCES: permission denied');
  assert.equal(typeof message.metadata.errorStack, 'string');
});

void test('CacheManager classifies rule execution failures separately from parse errors', async () => {
  const manager = new CacheManager(undefined, false);
  const doc: LintDocument = {
    id: 'rules.css',
    type: 'css',
    getText() {
      return Promise.resolve('.a { color: red; }');
    },
  };

  const error = new Error('Rule failed while visiting declaration');
  Object.defineProperty(error, 'ruleId', {
    value: 'no-hardcoded-colors',
    enumerable: true,
  });

  const result = await manager.processDocument(doc, () =>
    Promise.reject(error),
  );

  assert.equal(result.messages.length, 1);
  const [message] = result.messages;
  assert.equal(message.ruleId, RUNTIME_ERROR_RULE_ID);
  assert.equal(message.message, 'Rule failed while visiting declaration');
  assert.deepEqual(message.metadata.phase, 'lint');
  assert.deepEqual(message.metadata.sourceRule, 'no-hardcoded-colors');
  assert.deepEqual(
    message.metadata.errorMessage,
    'Rule failed while visiting declaration',
  );
});
