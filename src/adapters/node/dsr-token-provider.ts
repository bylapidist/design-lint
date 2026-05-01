import type { TokenProvider } from '../../core/environment.js';
import type {
  DesignTokens,
  DtifFlattenedToken,
  TokenMetadata,
  TokenResolution,
} from '../../core/types.js';
import type { NodeEnvironment } from '@lapidist/dsr/environments/node';
import type { DtifFlattenedToken as ParserDtifFlattenedToken } from '@lapidist/dtif-parser';

export type DsrEnvironmentFactory = () => Promise<NodeEnvironment>;

function isTokenMetadata(value: unknown): value is TokenMetadata {
  if (value === null || typeof value !== 'object') return false;
  if (!('extensions' in value)) return false;
  const exts: unknown = Reflect.get(value, 'extensions');
  return exts !== null && typeof exts === 'object';
}

function isTokenResolution(value: unknown): value is TokenResolution {
  return value !== null && typeof value === 'object' && 'id' in value;
}

/**
 * Maps a kernel token to the design-lint DtifFlattenedToken shape.
 *
 * When the kernel was bootstrapped via parseDtifTokenObject (the v8 path),
 * the stored token already carries full metadata (description, extensions,
 * deprecation, source) and resolution data. Those fields are read defensively
 * from the runtime value so they propagate to callers without needing a type
 * assertion — the DSR DSQL API types its response as the parser's leaner
 * DtifFlattenedToken, but the stored object may be richer.
 */
function toDesignLintToken(
  token: ParserDtifFlattenedToken,
): DtifFlattenedToken {
  const raw: unknown = token;
  const maybeMetadata: unknown =
    raw !== null && typeof raw === 'object'
      ? Object.getOwnPropertyDescriptor(raw, 'metadata')?.value
      : undefined;
  const maybeResolution: unknown =
    raw !== null && typeof raw === 'object'
      ? Object.getOwnPropertyDescriptor(raw, 'resolution')?.value
      : undefined;

  return {
    id: token.id,
    pointer: token.pointer,
    name: token.name,
    path: token.path,
    type: token.type,
    value: token.value,
    raw: token.raw,
    metadata: isTokenMetadata(maybeMetadata)
      ? maybeMetadata
      : { extensions: {} },
    ...(isTokenResolution(maybeResolution)
      ? { resolution: maybeResolution }
      : {}),
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
    const env = await this.#factory();
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
