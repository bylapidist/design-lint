import { globby } from 'globby';
import { performance } from 'node:perf_hooks';
import { realpathIfExists } from '../utils/paths.js';
import { getIgnorePatterns } from './ignore.js';
import type { Config } from './linter.js';
import type { DocumentSource } from './document-source.js';
import { createFileDocument } from '../node/file-document.js';

const defaultPatterns = [
  '**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs,css,scss,sass,less,svelte,vue}',
];

export class FileSource implements DocumentSource {
  async scan(
    targets: string[],
    config: Config,
    additionalIgnorePaths: string[] = [],
  ) {
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
      console.log(
        `Scanned ${String(files.length)} files in ${duration.toFixed(2)}ms`,
      );
    }
    return files.map(createFileDocument);
  }
}
