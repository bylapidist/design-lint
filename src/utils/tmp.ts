import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export function makeTmpDir(prefix = 'designlint-') {
  const base = os.tmpdir();
  const p = fs.mkdtempSync(path.join(base, prefix));
  return fs.realpathSync.native
    ? fs.realpathSync.native(p)
    : fs.realpathSync(p);
}
