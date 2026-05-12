/**
 * @packageDocumentation
 *
 * DSR kernel write API CLI commands.
 *
 * These commands connect to a running DSR kernel via Unix socket (or HTTP
 * fallback) and issue write operations via the Kernel Wire Protocol (KWP).
 *
 * Commands:
 *   token add       — register a new design token
 *   token deprecate — mark a token as deprecated with an optional replacement
 *   component register — register a component in the kernel's component registry
 *   rule configure  — update a rule's severity or options
 */
import path from 'node:path';

const DEFAULT_SOCKET_PATH = '/tmp/designlint-kernel.sock';
const DEFAULT_HTTP_PORT = 7341;

// ---------------------------------------------------------------------------
// Minimal local types (mirrors dsr/src/types.ts — avoids a hard runtime dep)
// ---------------------------------------------------------------------------

interface KWPFrame {
  type: string;
  id: string;
  method?: string;
  payload?: unknown;
  error?: { code: string; message: string };
}

interface TransportClient {
  connect(): Promise<void>;
  request(frame: KWPFrame): Promise<KWPFrame>;
  disconnect(): Promise<void>;
}

interface TransportDeps {
  UnixSocketClient: new (path: string) => TransportClient;
  HttpClient: new (port: number) => TransportClient;
}

interface ConnectOptions {
  socketPath?: string;
  httpPort?: number;
}

// ---------------------------------------------------------------------------
// Connection helper
// ---------------------------------------------------------------------------

async function connectClient(
  options: ConnectOptions,
  deps?: TransportDeps,
): Promise<TransportClient> {
  const { UnixSocketClient, HttpClient } =
    deps ?? (await import('@lapidist/dsr'));

  const socketClient = new UnixSocketClient(
    options.socketPath ?? DEFAULT_SOCKET_PATH,
  );

  try {
    await socketClient.connect();
    return socketClient;
  } catch {
    const httpClient = new HttpClient(options.httpPort ?? DEFAULT_HTTP_PORT);
    await httpClient.connect();
    return httpClient;
  }
}

async function voidRequest(
  client: TransportClient,
  method: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const response = await client.request({
    type: 'request',
    id: crypto.randomUUID(),
    method,
    payload,
  });

  if (response.error) {
    throw new Error(
      `Kernel error [${response.error.code}]: ${response.error.message}`,
    );
  }
}

// ---------------------------------------------------------------------------
// token add
// ---------------------------------------------------------------------------

export interface TokenAddOptions extends ConnectOptions {
  /** JSON pointer identifying the token (e.g. `/color/brand/primary`). */
  pointer: string;
  /** Human-readable token name. */
  name: string;
  /** DTIF token type (e.g. `color`, `dimension`). */
  type?: string;
  /** Serialised token value. Accepts JSON strings; parsed before sending. */
  value?: string;
}

/**
 * Register a new design token in the running DSR kernel.
 *
 * @param options - Token metadata and connection options.
 * @param deps    - Optional transport overrides (used in tests).
 */
export async function tokenAdd(
  options: TokenAddOptions,
  deps?: TransportDeps,
): Promise<void> {
  const pointer = path.posix.normalize(
    options.pointer.startsWith('/') ? options.pointer : `/${options.pointer}`,
  );

  const token: Record<string, unknown> = {
    id: pointer.replace(/^\//, '').replaceAll('/', '.'),
    pointer,
    name: options.name,
    path: pointer.replace(/^\//, '').split('/'),
    raw: {},
  };

  if (options.type !== undefined) token.type = options.type;

  if (options.value !== undefined) {
    try {
      token.value = JSON.parse(options.value);
    } catch {
      token.value = options.value;
    }
  }

  const client = await connectClient(options, deps);
  try {
    await voidRequest(client, 'write.addToken', { pointer, token });
    console.log(`Token added: ${pointer}`);
  } finally {
    await client.disconnect();
  }
}

// ---------------------------------------------------------------------------
// token deprecate
// ---------------------------------------------------------------------------

export interface TokenDeprecateOptions extends ConnectOptions {
  /** JSON pointer of the token to deprecate. */
  pointer: string;
  /** Optional replacement token pointer. */
  replacement?: string;
}

/**
 * Mark a design token as deprecated in the running DSR kernel.
 *
 * @param options - Deprecation details and connection options.
 * @param deps    - Optional transport overrides (used in tests).
 */
export async function tokenDeprecate(
  options: TokenDeprecateOptions,
  deps?: TransportDeps,
): Promise<void> {
  const pointer = path.posix.normalize(
    options.pointer.startsWith('/') ? options.pointer : `/${options.pointer}`,
  );

  const payload: Record<string, unknown> = { pointer };
  if (options.replacement !== undefined)
    payload.replacement = options.replacement;

  const client = await connectClient(options, deps);
  try {
    await voidRequest(client, 'write.deprecateToken', payload);
    const suffix =
      options.replacement !== undefined
        ? ` (replacement: ${options.replacement})`
        : '';
    console.log(`Token deprecated: ${pointer}${suffix}`);
  } finally {
    await client.disconnect();
  }
}

// ---------------------------------------------------------------------------
// component register
// ---------------------------------------------------------------------------

export interface ComponentRegisterOptions extends ConnectOptions {
  /** Component name (must be unique in the registry). */
  name: string;
  /** Package that exports this component. */
  packageName: string;
  /** Optional semver version of the package. */
  version?: string;
  /** Optional comma-separated list of component names this replaces. */
  replaces?: string;
}

/**
 * Register a component in the running DSR kernel's component registry.
 *
 * @param options - Component definition and connection options.
 * @param deps    - Optional transport overrides (used in tests).
 */
export async function componentRegister(
  options: ComponentRegisterOptions,
  deps?: TransportDeps,
): Promise<void> {
  const definition: Record<string, unknown> = {
    name: options.name,
    package: options.packageName,
  };

  if (options.version !== undefined) definition.version = options.version;

  if (options.replaces !== undefined) {
    definition.replaces = options.replaces
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const client = await connectClient(options, deps);
  try {
    await voidRequest(client, 'write.registerComponent', {
      name: options.name,
      definition,
    });
    console.log(
      `Component registered: ${options.name} (${options.packageName})`,
    );
  } finally {
    await client.disconnect();
  }
}

// ---------------------------------------------------------------------------
// rule configure
// ---------------------------------------------------------------------------

export interface RuleConfigureOptions extends ConnectOptions {
  /** Rule identifier (e.g. `color/no-raw-value`). */
  ruleId: string;
  /** New severity: `error`, `warn`, or `off`. */
  severity?: string;
  /** Rule options as a JSON string. */
  options?: string;
}

/**
 * Update a rule's configuration in the running DSR kernel.
 *
 * @param options - Rule configuration and connection options.
 * @param deps    - Optional transport overrides (used in tests).
 */
export async function ruleConfigure(
  options: RuleConfigureOptions,
  deps?: TransportDeps,
): Promise<void> {
  const partial: Record<string, unknown> = {};

  if (options.severity !== undefined) {
    const valid = new Set(['error', 'warn', 'off']);
    if (!valid.has(options.severity)) {
      throw new Error(
        `Invalid severity "${options.severity}". Expected one of: error, warn, off.`,
      );
    }
    partial.severity = options.severity;
    partial.enabled = options.severity !== 'off';
  }

  if (options.options !== undefined) {
    try {
      partial.options = JSON.parse(options.options);
    } catch {
      throw new Error(`Invalid JSON for --options: ${options.options}`);
    }
  }

  if (Object.keys(partial).length === 0) {
    throw new Error('Provide at least one of --severity or --options.');
  }

  const client = await connectClient(options, deps);
  try {
    await voidRequest(client, 'write.configureRule', {
      ruleId: options.ruleId,
      partial,
    });
    console.log(`Rule configured: ${options.ruleId}`);
  } finally {
    await client.disconnect();
  }
}
