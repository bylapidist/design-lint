/**
 * @packageDocumentation
 *
 * Utilities for consistent error handling around design token processing.
 */

/**
 * Wrap an unknown error thrown during token processing with theme context.
 *
 * @param theme - Theme name associated with the tokens.
 * @param cause - Original error or thrown value.
 * @param action - Action being performed like 'parse' or 'read'.
 * @returns An Error with contextual message and original cause.
 *
 * @example
 * ```ts
 * try {
 *   // parseDesignTokens(tokens);
 * } catch (err) {
 *   throw wrapTokenError('light', err, 'parse');
 * }
 * ```
 */
export function wrapTokenError(
  theme: string,
  cause: unknown,
  action: string,
): Error {
  const message = cause instanceof Error ? cause.message : String(cause);
  const error = new Error(
    `Failed to ${action} tokens for theme "${theme}": ${message}`,
  );
  return Object.assign(error, { cause });
}
