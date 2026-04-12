import type { Config } from '@lapidist/design-lint';

/**
 * AI agent rule configuration preset for `@lapidist/design-lint`.
 *
 * Enables all rules that target AI coding agent failure modes at `error`
 * severity. Use this alongside `recommended` or `strict` in CI pipelines
 * that review AI-generated code.
 *
 * @example
 * ```ts
 * import { defineConfig } from '@lapidist/design-lint';
 * import recommended from '@lapidist/design-lint-config-recommended';
 * import aiAgent from '@lapidist/design-lint-config-ai-agent';
 *
 * export default defineConfig({ ...recommended, ...aiAgent });
 * ```
 */
const aiAgent = {
  rules: {
    'design-token/easing': 'error',
    'design-token/css-var-provenance': 'error',
    'design-token/composite-equivalence': 'error',
    'design-system/jsx-style-values': 'error',
    'design-system/no-hardcoded-spacing': 'error',
  },
} satisfies Config;

export default aiAgent;
