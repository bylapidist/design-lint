import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeTmpDir } from '../src/adapters/node/utils/tmp.js';
import { createLinter as initLinter } from '../src/index.js';
import { FileSource } from '../src/adapters/node/file-source.js';

void test('lintTargets uses patterns option to include custom extensions', async () => {
  const tmp = makeTmpDir();
  const file = path.join(tmp, 'bad.foo');
  fs.writeFileSync(file, "const color = '#ffffff';");
  const baseConfig = {
    tokens: {
      color: { $type: 'color', primary: { $value: '#000000' } },
    },
    rules: { 'design-token/colors': 'error' },
  };
  const defaultLinter = initLinter(baseConfig, new FileSource());
  const { results: defaultResults } = await defaultLinter.lintTargets([tmp]);
  assert.equal(defaultResults.length, 0);
  const customLinter = initLinter(
    { ...baseConfig, patterns: ['**/*.foo'] },
    new FileSource(),
  );
  const { results: customResults } = await customLinter.lintTargets([tmp]);
  assert.equal(customResults.length, 1);
  assert.equal(customResults[0].sourceId, file);
});
