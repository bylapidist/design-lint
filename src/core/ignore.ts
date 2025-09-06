import { promises as fs } from 'fs';
import path from 'path';
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

export async function loadIgnore(
  config?: Config,
  additionalPaths: string[] = [],
): Promise<{
  ig: ignore.Ignore;
  patterns: string[];
}> {
  const gitIgnore = path.join(process.cwd(), '.gitignore');
  const designIgnore = path.join(process.cwd(), '.designlintignore');
  const ignorePatterns = [...defaultIgnore];
  const ig = ignore();
  ig.add(defaultIgnore);

  const readIgnore = async (file: string) => {
    try {
      const content = await fs.readFile(file, 'utf8');
      ig.add(content);
      const lines = content
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#'));
      const positives = lines.filter((l) => !l.startsWith('!'));
      ignorePatterns.push(...positives);
    } catch {
      // no ignore file
    }
  };

  await Promise.all([
    readIgnore(gitIgnore),
    readIgnore(designIgnore),
    ...additionalPaths.map(readIgnore),
  ]);

  if (config?.ignoreFiles) {
    const normalized = config.ignoreFiles.map((p) => p.replace(/\\/g, '/'));
    ig.add(normalized);
    ignorePatterns.push(...normalized.filter((p) => !p.startsWith('!')));
  }

  const normalizedPatterns = ignorePatterns.map((p) => p.replace(/\\/g, '/'));
  return { ig, patterns: normalizedPatterns };
}
