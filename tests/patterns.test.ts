import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeTmpDir } from '../src/adapters/node/utils/tmp.ts';
import { Linter } from '../src/core/linter.ts';
import { FileSource } from '../src/adapters/node/file-source.ts';

void test('lintFiles uses patterns option to include custom extensions', async () => {
  const tmp = makeTmpDir();
  const file = path.join(tmp, 'bad.foo');
  fs.writeFileSync(file, "const color = '#ffffff';");
  const baseConfig = {
    tokens: { colors: { primary: '#000000' } },
    rules: { 'design-token/colors': 'error' },
  };
  const defaultLinter = new Linter(baseConfig, new FileSource());
  const { results: defaultResults } = await defaultLinter.lintFiles([tmp]);
  assert.equal(defaultResults.length, 0);
  const customLinter = new Linter(
    { ...baseConfig, patterns: ['**/*.foo'] },
    new FileSource(),
  );
  const { results: customResults } = await customLinter.lintFiles([tmp]);
  assert.equal(customResults.length, 1);
  assert.equal(customResults[0].sourceId, file);
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  assert.equal(customResults[0].filePath, file);
});
