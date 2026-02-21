import test from 'node:test';
import assert from 'node:assert/strict';
import picomatch from 'picomatch';
import { TOKEN_FILE_GLOB } from '../../../src/utils/tokens/files.ts';

void test('TOKEN_FILE_GLOB matches supported token file names', () => {
  const matches = picomatch(TOKEN_FILE_GLOB);

  assert.equal(matches('tokens/base.tokens'), true);
  assert.equal(matches('tokens/base.tokens.json'), true);
  assert.equal(matches('tokens/base.tokens.yaml'), true);
  assert.equal(matches('tokens/base.tokens.yml'), true);
  assert.equal(matches('tokens/base.json'), false);
});
