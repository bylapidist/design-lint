import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { LintDocument } from '../core/environment.js';

export function createFileDocument(filePath: string): LintDocument {
  const absPath = path.resolve(filePath);
  const ext = path.extname(absPath).slice(1).toLowerCase();
  const typeMap: Record<string, string> = {
    ts: 'ts',
    tsx: 'ts',
    mts: 'ts',
    cts: 'ts',
    js: 'ts',
    jsx: 'ts',
    mjs: 'ts',
    cjs: 'ts',
    css: 'css',
    scss: 'css',
    sass: 'css',
    less: 'css',
    vue: 'vue',
    svelte: 'svelte',
  };
  const type = typeMap[ext] ?? ext;
  return {
    id: absPath,
    type,
    async getText() {
      return readFile(absPath, 'utf8');
    },
  };
}
