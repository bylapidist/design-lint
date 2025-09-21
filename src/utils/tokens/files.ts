/**
 * @packageDocumentation
 *
 * Shared constants for token file discovery.
 */

/**
 * Recognised filename suffixes for token definition files.
 */
export const TOKEN_FILE_SUFFIXES = [
  '.tokens',
  '.tokens.json',
  '.tokens.yaml',
  '.tokens.yml',
  '.dtif',
  '.dtif.json',
  '.dtif.yaml',
  '.dtif.yml',
] as const;

/**
 * Determines whether a path refers to a supported token definition file.
 */
export function isSupportedTokenFilePath(filePath: string): boolean {
  const normalized = filePath.toLowerCase();
  return TOKEN_FILE_SUFFIXES.some((suffix) => normalized.endsWith(suffix));
}

/**
 * Glob pattern matching token definition files.
 *
 * Used by CLI commands to watch for changes to design token sources.
 */
export const TOKEN_FILE_GLOB = '**/*.{tokens,dtif}{,.json,.yaml,.yml}';
