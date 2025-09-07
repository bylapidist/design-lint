import { globby } from 'globby';
import { performance } from 'node:perf_hooks';
import { realpathIfExists } from '../utils/paths.js';
import { getIgnorePatterns } from './ignore.js';
import type { Config } from './linter.js';

const defaultPatterns = [
  '**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs,css,scss,sass,less,svelte,vue}',
];

export class FileService {
  static async scan(
    targets: string[],
    config: Config,
    additionalIgnorePaths: string[] = [],
  ): Promise<string[]> {
    const patterns = config.patterns ?? defaultPatterns;
    const ignore = getIgnorePatterns(config);
    const start = performance.now();
    const files = (
      await globby(targets, {
        expandDirectories: patterns,
        gitignore: true,
        ignore,
        ignoreFiles: ['**/.designlintignore', ...additionalIgnorePaths],
        dot: true,
        absolute: true,
      })
    ).map(realpathIfExists);
    const duration = performance.now() - start;
    if (process.env.DESIGNLINT_PROFILE) {
      console.log(`Scanned ${files.length} files in ${duration.toFixed(2)}ms`);
    }
    return files;
  }
}
