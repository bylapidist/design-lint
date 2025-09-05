import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

/**
 * Create a temporary directory and return its resolved path.
 * @param prefix Directory name prefix.
 * @returns Absolute path to the created directory.
 */
export function makeTmpDir(prefix = 'designlint-') {
  const base = os.tmpdir();
  const p = fs.mkdtempSync(path.join(base, prefix));
  if (fs.realpathSync.native) {
    return fs.realpathSync.native(p);
  }
  /* c8 ignore next */
  return fs.realpathSync(p);
}
