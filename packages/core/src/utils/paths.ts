import type { PathUtils, FileSystem } from '@lapidist/design-lint-shared';
import { nodeEnv } from '@lapidist/design-lint-shared';

/**
 * Convert a filesystem path to use POSIX separators.
 * @param p Path to normalize.
 * @param pathUtils Optional path utilities implementation.
 * @returns Path with forward slashes.
 */
export const toPosix = (p: string, pathUtils: PathUtils = nodeEnv.path) =>
  p.split(pathUtils.sep).join('/');

/**
 * Compute the relative POSIX path from a root directory.
 * @param root Base directory.
 * @param p Target path.
 * @param pathUtils Optional path utilities implementation.
 * @returns Relative path using POSIX separators.
 */
export const relFrom = (
  root: string,
  p?: string,
  pathUtils: PathUtils = nodeEnv.path,
) => {
  if (!p) return '';
  const rel = pathUtils.relative(root, p);
  return toPosix(rel, pathUtils);
};

/**
 * Compute a POSIX relative path from the current working directory.
 * @param p Target path.
 * @param pathUtils Optional path utilities implementation.
 * @returns Relative path using POSIX separators.
 */
export const relFromCwd = (p: string, pathUtils: PathUtils = nodeEnv.path) =>
  relFrom(process.cwd(), p, pathUtils);

/**
 * Resolve the real path if it exists, otherwise return the input path.
 * @param p Path to resolve.
 * @param fs Optional file system implementation.
 * @returns Resolved path or the original path if resolution fails.
 */
export const realpathIfExists = (p: string, fs: FileSystem = nodeEnv.fs) => {
  try {
    return fs.realpath(p);
  } catch {
    return p;
  }
};
