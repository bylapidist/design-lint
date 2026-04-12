import type { Config } from '@lapidist/design-lint';

/**
 * Recommended rule configuration preset for `@lapidist/design-lint`.
 *
 * Enables all stable rules at `warn` severity. Extend this preset and
 * override individual rules to tighten or loosen enforcement.
 *
 * @example
 * ```ts
 * import { defineConfig } from '@lapidist/design-lint';
 * import recommended from '@lapidist/design-lint-config-recommended';
 *
 * export default defineConfig({ ...recommended });
 * ```
 */
const recommended = {
  rules: {
    'design-token/colors': 'warn',
    'design-token/typography': 'warn',
    'design-token/spacing': 'warn',
    'design-token/easing': 'warn',
    'design-token/css-var-provenance': 'warn',
    'design-token/composite-equivalence': 'warn',
    'design-token/no-deprecated': 'warn',
    'design-system/jsx-style-values': 'warn',
    'design-system/no-hardcoded-spacing': 'warn',
  },
} satisfies Config;

export default recommended;
