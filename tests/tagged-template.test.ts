import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createLinter as initLinter } from '../src/index.js';
import { FileSource } from '../src/adapters/node/file-source.js';
import { loadConfig } from '../src/config/loader.js';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const fixtureDir = path.join(__dirname, 'fixtures', 'tagged-template');

void test('reports CSS in tagged template literals', async () => {
  const config = await loadConfig(fixtureDir);
  const linter = initLinter(config, { documentSource: new FileSource() });
  const file = path.join(fixtureDir, 'src', 'styled.ts');
  const {
    results: [res],
  } = await linter.lintTargets([file]);
  const colorMessages = res.messages.filter(
    (m) => m.ruleId === 'design-token/colors',
  );
  assert.equal(colorMessages.length, 2);
});

void test('reports static declarations inside interpolated tagged templates', async () => {
  const config = await loadConfig(fixtureDir);
  const linter = initLinter(config, { documentSource: new FileSource() });
  const res = await linter.lintText(
    [
      "import styled from 'styled-components';",
      'const gap = 8;',
      'export const Dynamic = styled.div`',
      '  color: red;',
      '  margin: ${gap}px;',
      '  border-color: red;',
      '`;',
    ].join('\n'),
    'styled.ts',
  );
  const colorMessages = res.messages.filter(
    (m) => m.ruleId === 'design-token/colors',
  );
  assert.equal(colorMessages.length, 2);
  assert.deepEqual(
    colorMessages.map((message) => message.line),
    [3, 5],
  );
});

void test('does not lint unknown tagged templates unless explicitly configured', async () => {
  const config = await loadConfig(fixtureDir);
  const linter = initLinter(config, { documentSource: new FileSource() });
  const res = await linter.lintText(
    'const cssx = (input) => input; const Button = cssx`color: red;`;',
    'styled.ts',
  );
  const colorMessages = res.messages.filter(
    (m) => m.ruleId === 'design-token/colors',
  );
  assert.equal(colorMessages.length, 0);
});

void test('lints explicitly configured template tags', async () => {
  const config = await loadConfig(fixtureDir);
  const strictConfig = {
    ...config,
    templateTags: ['cssx'],
  };
  const linter = initLinter(strictConfig, { documentSource: new FileSource() });
  const res = await linter.lintText(
    'const cssx = (input) => input; const Button = cssx`color: red;`;',
    'styled.ts',
  );
  const colorMessages = res.messages.filter(
    (m) => m.ruleId === 'design-token/colors',
  );
  assert.equal(colorMessages.length, 1);
});
