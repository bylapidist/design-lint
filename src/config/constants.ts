/**
 * @packageDocumentation
 *
 * Shared constants for configuration resolution.
 */

/**
 * Filenames searched when resolving a configuration file.
 *
 * Mirrors cosmiconfig search behavior for design-lint and is reused across
 * configuration helpers and tests to ensure consistency.
 */
export const CONFIG_SEARCH_PLACES = [
  'package.json',
  'designlint.config.ts',
  'designlint.config.mts',
  'designlint.config.js',
  'designlint.config.mjs',
  'designlint.config.cjs',
  'designlint.config.json',
  '.designlintrc',
  '.designlintrc.json',
  '.designlintrc.yaml',
  '.designlintrc.yml',
  '.designlintrc.js',
  '.designlintrc.cjs',
  '.designlintrc.mjs',
  '.designlintrc.ts',
  '.designlintrc.mts',
] as const;

/**
 * Config keys that are merged by concatenating array values from root to leaf.
 */
export const CONFIG_ARRAY_MERGE_KEYS = [
  'plugins',
  'ignoreFiles',
  'patterns',
] as const;

export type ConfigArrayMergeKey = (typeof CONFIG_ARRAY_MERGE_KEYS)[number];

const CONFIG_ARRAY_MERGE_KEY_SET: ReadonlySet<string> = new Set(
  CONFIG_ARRAY_MERGE_KEYS,
);

/**
 * Type guard for keys merged as arrays during hierarchical config loading.
 */
export const isConfigArrayMergeKey = (
  key: string,
): key is ConfigArrayMergeKey => CONFIG_ARRAY_MERGE_KEY_SET.has(key);
