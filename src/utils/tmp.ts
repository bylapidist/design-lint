import { temporaryDirectory } from 'tempy';

/**
 * Create a temporary directory using {@link https://github.com/sindresorhus/tempy | tempy}.
 *
 * @param prefix Directory name prefix.
 * @returns Absolute path to the created directory.
 */
export function makeTmpDir(prefix = 'designlint-') {
  const sanitizedPrefix = prefix.replace(/[-_]+$/, '');
  return temporaryDirectory({ prefix: sanitizedPrefix });
}
