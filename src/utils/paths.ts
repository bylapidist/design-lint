import path from 'node:path';
import fs from 'node:fs';

/**
 * Convert a filesystem path to use POSIX separators.
 * @param p Path to normalize.
 * @returns Path with forward slashes.
 */
export const toPosix = (p: string) => p.split(path.sep).join('/');

/**
 * Compute the relative POSIX path from a root directory.
 * @param root Base directory.
 * @param p Target path.
 * @returns Relative path using POSIX separators.
 */
export const relFrom = (root: string, p: string) => {
  const rel = path.relative(root, p || '');
  return toPosix(rel);
};

/**
 * Compute a POSIX relative path from the current working directory.
 * @param p Target path.
 * @returns Relative path using POSIX separators.
 */
export const relFromCwd = (p: string) => relFrom(process.cwd(), p);

/**
 * Resolve the real path if it exists, otherwise return the input path.
 * @param p Path to resolve.
 * @returns Resolved path or the original path if resolution fails.
 */
export const realpathIfExists = (p: string) => {
  try {
    return fs.realpathSync.native
      ? fs.realpathSync.native(p)
      : fs.realpathSync(p);
  } catch {
    return p;
  }
};
