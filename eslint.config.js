import { createConfig } from '@lapidist/eslint-config';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export default createConfig({
  tsconfigRootDir: dirname(fileURLToPath(import.meta.url)),
  ignores: ['tests/fixtures/**'],
});
