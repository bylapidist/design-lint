import type { TokenProvider } from '../../core/environment.js';
import type { DesignTokens, DtifFlattenedToken } from '../../core/types.js';
import type { NodeEnvironment } from '@lapidist/dsr/environments/node';
import type { DtifFlattenedToken as ParserDtifFlattenedToken } from '@lapidist/dtif-parser';

export type DsrEnvironmentFactory = () => NodeEnvironment;

/**
 * Maps a @lapidist/dtif-parser DtifFlattenedToken to the design-lint
 * DtifFlattenedToken shape. design-lint extends the parser type with
 * `metadata` (description, extensions, deprecation, source) and optional
 * `resolution` (alias chain). DSR kernel tokens do not carry these enriched
 * fields yet — Phase 5 will unify the types under a single import. Until
 * then we provide safe empty defaults.
 */
function toDesignLintToken(
  token: ParserDtifFlattenedToken,
): DtifFlattenedToken {
  return {
    id: token.id,
    pointer: token.pointer,
    name: token.name,
    path: token.path,
    type: token.type,
    value: token.value,
    raw: token.raw,
    metadata: { extensions: {} },
  };
}

/**
 * Token provider that fetches the full design token graph from a running
 * DSR kernel via the DSQL protocol. Receives a factory so the connection is
 * deferred until load() is called and can be disposed cleanly afterwards.
 *
 * Uses forProperty('') to retrieve all tokens — the kernel falls through to
 * "return all non-deprecated tokens" when the CSS property string is not
 * recognised.
 */
export class DsrTokenProvider implements TokenProvider {
  readonly #factory: DsrEnvironmentFactory;
  #env: NodeEnvironment | null = null;

  constructor(factory: DsrEnvironmentFactory) {
    this.#factory = factory;
  }

  async load(): Promise<
    Record<string, DesignTokens | readonly DtifFlattenedToken[]>
  > {
    const env = this.#factory();
    await env.connect();
    this.#env = env;

    const parserTokens = await env.dsql.tokens().forProperty('');
    const tokens: readonly DtifFlattenedToken[] =
      parserTokens.map(toDesignLintToken);

    return { default: tokens };
  }

  async dispose(): Promise<void> {
    if (this.#env) {
      await this.#env.disconnect();
      this.#env = null;
    }
  }
}
