import { promises as fs } from 'node:fs';
import path from 'node:path';
import ignore from 'ignore';
import type { Config } from './linter.js';

export const defaultIgnore = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/.next/**',
  '**/.nuxt/**',
  '**/out/**',
  '**/.cache/**',
];

export function getIgnorePatterns(config?: Config): string[] {
  const fromConfig =
    config?.ignoreFiles?.map((p) => p.replace(/\\/g, '/')) ?? [];
  return [...defaultIgnore, ...fromConfig];
}

export async function loadIgnore(
  config?: Config,
  additionalPaths: string[] = [],
): Promise<{ ig: ignore.Ignore; patterns: string[] }> {
  const ig = ignore();
  const patterns = getIgnorePatterns(config);
  ig.add(patterns);
  const files = ['.gitignore', '.designlintignore', ...additionalPaths];
  for (const file of files) {
    try {
      const content = await fs.readFile(
        path.resolve(process.cwd(), file),
        'utf8',
      );
      ig.add(content);
      const lines = content
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#'));
      patterns.push(...lines);
    } catch {
      // ignore missing files
    }
  }
  return { ig, patterns };
}
