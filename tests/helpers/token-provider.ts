import type { Config } from '../../src/core/linter.js';
import type { TokenProvider } from '../../src/core/environment.js';
import { ConfigTokenProvider } from '../../src/config/config-token-provider.js';

/**
 * Returns a TokenProvider backed by the config's inline tokens.
 * Use this in tests instead of relying on a running DSR kernel.
 */
export function createConfigTokenProvider(config: Config): TokenProvider {
  return new ConfigTokenProvider(config);
}

/**
 * Returns a TokenProvider that always resolves to an empty token set.
 * Use this in tests that exercise linting mechanics but don't need tokens.
 */
export function createEmptyTokenProvider(): TokenProvider {
  return {
    load: () => Promise.resolve({}),
  };
}
