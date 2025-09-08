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
