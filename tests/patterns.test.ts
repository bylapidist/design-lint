import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeTmpDir } from '../src/utils/tmp';
import { Linter } from '../src/core/engine';

test('lintFiles uses patterns option to include custom extensions', async () => {
  const tmp = makeTmpDir();
  const file = path.join(tmp, 'bad.foo');
  fs.writeFileSync(file, "const color = '#ffffff';");
  const baseConfig = {
    tokens: { colors: { primary: '#000000' } },
    rules: { 'design-token/colors': 'error' },
  };
  const defaultLinter = new Linter(baseConfig);
  const defaultResults = await defaultLinter.lintFiles([tmp]);
  assert.equal(defaultResults.length, 0);
  const customLinter = new Linter({ ...baseConfig, patterns: ['**/*.foo'] });
  const customResults = await customLinter.lintFiles([tmp]);
  assert.equal(customResults.length, 1);
  assert.equal(customResults[0].filePath, file);
});
