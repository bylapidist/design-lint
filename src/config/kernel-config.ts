import type { Config } from '../core/linter.js';
import type { DesignTokens } from '../core/types.js';

/**
 * Extends the public {@link Config} with the `tokens` field used exclusively
 * by the kernel daemon to seed the DSR kernel on startup.
 *
 * This type is internal to the `design-lint` package. It is the shape that
 * `loadConfig` returns (so that token file references can be resolved from the
 * config path) but it is NOT exported as part of the public API. Callers using
 * `createLinter` or `createLintService` always receive a `Config`, never a
 * `KernelConfig`.
 *
 * @internal
 */
export interface KernelConfig extends Config {
  tokens?:
    | DesignTokens
    | Record<string, DesignTokens | string>
    | Record<string, unknown>;
}
