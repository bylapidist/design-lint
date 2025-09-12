/**
 * @packageDocumentation
 *
 * CSS-related helpers for working with design tokens.
 */

/**
 * Extract the CSS variable name from a `var()` expression.
 *
 * @param value - CSS value potentially containing a `var()` reference.
 * @returns The CSS custom property name (e.g., `--color-primary`) or `null` when the value is not a valid `var()` expression.
 */
export function extractVarName(value: string): string | null {
  const m = /^var\(\s*(--[A-Za-z0-9_-]+)\s*(?:,.*)?\)$/.exec(value.trim());
  return m ? m[1] : null;
}
