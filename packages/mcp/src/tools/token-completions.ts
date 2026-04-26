import type { Linter } from '@lapidist/design-lint';
import type { TokenCompletionParams, TokenCompletion } from '../types.js';

/**
 * Optional interface for resolving actual token values from a live DSR kernel.
 * When provided to `handleTokenCompletions`, resolved values replace the
 * fabricated CSS variable fallback for each token.
 */
export interface TokenValueResolver {
  /** Returns the resolved CSS value for a token pointer, or undefined when unknown. */
  resolve(pointer: string): string | undefined;
}

function toCssVar(tokenPath: string): string {
  const parts = tokenPath.split('.');
  const varParts = parts
    .map((p) => p.replaceAll(/[^a-z0-9]/gi, '-').toLowerCase())
    .filter((p) => p.length > 0);
  return `var(--${varParts.join('-')})`;
}

function matchesPartial(
  resolvedValue: string,
  tokenPath: string,
  partialValue: string,
): boolean {
  const lower = partialValue.toLowerCase();
  return (
    resolvedValue.toLowerCase().includes(lower) ||
    tokenPath.toLowerCase().includes(lower)
  );
}

export function handleTokenCompletions(
  linter: Linter,
  params: TokenCompletionParams,
  resolver?: TokenValueResolver,
): TokenCompletion[] {
  const { cssProperty, partialValue } = params;
  const allCompletions = linter.getTokenCompletions();

  const results: TokenCompletion[] = [];

  for (const [theme, paths] of Object.entries(allCompletions)) {
    for (const tokenPath of paths) {
      // Filter: if cssProperty is provided, match tokens whose path segment
      // aligns with the CSS property category (colour, spacing, etc.)
      if (!isRelevantForProperty(tokenPath, cssProperty)) continue;

      // Use kernel-resolved value when available; fall back to fabricated CSS var.
      const resolvedValue =
        resolver?.resolve(tokenPath) ?? resolveDisplayValue(tokenPath, theme);

      if (
        partialValue &&
        !matchesPartial(resolvedValue, tokenPath, partialValue)
      ) {
        continue;
      }

      results.push({
        tokenPath,
        resolvedValue,
        cssVar: toCssVar(tokenPath),
        displayName: tokenPath.split('.').at(-1) ?? tokenPath,
      });
    }
  }

  return results;
}

function isRelevantForProperty(
  tokenPath: string,
  cssProperty: string,
): boolean {
  if (!cssProperty) return true;
  const lower = tokenPath.toLowerCase();
  const prop = cssProperty.toLowerCase();

  const colorProps = [
    'color',
    'background',
    'border-color',
    'outline-color',
    'fill',
    'stroke',
  ];
  const spacingProps = [
    'margin',
    'padding',
    'gap',
    'top',
    'right',
    'bottom',
    'left',
    'inset',
  ];
  const typographyProps = [
    'font-size',
    'font-family',
    'font-weight',
    'line-height',
    'letter-spacing',
  ];
  const radiusProps = ['border-radius'];
  const shadowProps = ['box-shadow', 'text-shadow'];
  const easingProps = [
    'transition-timing-function',
    'animation-timing-function',
  ];
  const durationProps = ['transition-duration', 'animation-duration'];

  if (colorProps.includes(prop))
    return lower.includes('color') || lower.includes('colour');
  if (spacingProps.includes(prop))
    return (
      lower.includes('spacing') ||
      lower.includes('space') ||
      lower.includes('size')
    );
  if (typographyProps.includes(prop))
    return (
      lower.includes('typography') ||
      lower.includes('font') ||
      lower.includes('text')
    );
  if (radiusProps.includes(prop))
    return lower.includes('radius') || lower.includes('corner');
  if (shadowProps.includes(prop))
    return lower.includes('shadow') || lower.includes('elevation');
  if (easingProps.includes(prop))
    return lower.includes('easing') || lower.includes('timing');
  if (durationProps.includes(prop))
    return lower.includes('duration') || lower.includes('timing');

  return true;
}

function resolveDisplayValue(tokenPath: string, theme: string): string {
  // Fallback used when no TokenValueResolver is supplied (kernel not running).
  return `var(--${theme}-${tokenPath.replaceAll('.', '-')})`;
}
