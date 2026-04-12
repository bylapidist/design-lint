import type { Config } from '@lapidist/design-lint';

/**
 * Strict rule configuration preset for `@lapidist/design-lint`.
 *
 * Extends the recommended preset, upgrading all rules to `error` severity
 * and enabling additional experimental rules.
 *
 * @example
 * ```ts
 * import { defineConfig } from '@lapidist/design-lint';
 * import strict from '@lapidist/design-lint-config-strict';
 *
 * export default defineConfig({ ...strict });
 * ```
 */
const strict = {
  rules: {
    'design-token/colors': 'error',
    'design-token/typography': 'error',
    'design-token/spacing': 'error',
    'design-token/easing': 'error',
    'design-token/css-var-provenance': 'error',
    'design-token/composite-equivalence': 'error',
    'design-token/no-deprecated': 'error',
    'design-system/jsx-style-values': 'error',
    'design-system/no-hardcoded-spacing': 'error',
  },
} satisfies Config;

export default strict;
