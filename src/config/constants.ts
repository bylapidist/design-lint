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
