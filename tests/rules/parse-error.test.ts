import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createLinter as initLinter } from '../../src/index.js';
import { FileSource } from '../../src/adapters/node/file-source.js';
import { createNodeEnvironment } from '../../src/adapters/node/environment.js';
import { createFileDocument } from '../../src/adapters/node/file-document.js';
import { RUNTIME_ERROR_RULE_ID } from '../../src/core/cache-manager.js';

void test('reports CSS parse errors', async () => {
  const linter = initLinter({}, new FileSource());
  const res = await linter.lintText('.a { color: red;', 'bad.css');
  assert.equal(res.messages.length, 1);
  assert.equal(res.messages[0].severity, 'error');
  assert.equal(res.messages[0].ruleId, 'parse-error');
});

void test('does not map rule execution failures to parse-error', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'parse-error-'));
  const pluginFile = path.join(dir, 'throwing-plugin.cjs');
  const cssFile = path.join(dir, 'sample.css');

  await fs.writeFile(
    pluginFile,
    `module.exports = {
  rules: [
    {
      name: 'throwing-rule',
      meta: { description: 'Throws to simulate runtime failure' },
      create() {
        return {
          onCSSDeclaration() {
            const err = new Error('rule execution failed');
            err.sourceRule = 'throwing-rule';
            throw err;
          },
        };
      },
    },
  ],
};`,
  );
  await fs.writeFile(cssFile, '.a { color: red; }\n');

  const config = {
    plugins: [pluginFile],
    rules: {
      'throwing-rule': 'error',
    },
  };
  const linter = initLinter(config, createNodeEnvironment(config));
  const result = await linter.lintDocument(createFileDocument(cssFile));

  assert.equal(result.messages.length, 1);
  const [message] = result.messages;
  assert.equal(message.ruleId, RUNTIME_ERROR_RULE_ID);
  assert.notEqual(message.ruleId, 'parse-error');
  assert.equal(message.metadata.phase, 'lint');
});
