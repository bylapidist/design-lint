import path from 'node:path';
import fs from 'node:fs';

export const toPosix = (p: string) => p.split(path.sep).join('/');

export const relFrom = (root: string, p: string) => {
  const rel = path.relative(root, p || '');
  const safe = rel === '' ? '.' : rel;
  return toPosix(safe);
};

export const relFromCwd = (p: string) => relFrom(process.cwd(), p);

export const realpathIfExists = (p: string) => {
  try {
    return fs.realpathSync.native
      ? fs.realpathSync.native(p)
      : fs.realpathSync(p);
  } catch {
    return p;
  }
};
