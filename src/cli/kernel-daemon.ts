/**
 * DSR kernel daemon entry point.
 *
 * Spawned as a detached child process by `design-lint kernel start`.
 * Starts the KernelProcess and keeps the event loop alive until a SIGTERM
 * or SIGINT signal is received.
 *
 * CLI args:
 *   --socket-path <path>   Unix socket path (default: /tmp/designlint-kernel.sock)
 *   --http-port   <n>      HTTP fallback port (default: 7341)
 *   --pid-file    <path>   PID file path (default: /tmp/designlint-kernel.pid)
 *   --no-http              Disable HTTP fallback transport
 *   --config-path <path>   Path to designlint.config.* — when provided, tokens are
 *                          loaded from config and injected into the kernel on startup
 */

interface KernelOptions {
  socketPath?: string;
  httpPort?: number;
  pidFile?: string;
  enableHttp?: boolean;
}

interface StartableKernel {
  start(): Promise<void>;
  // token is typed as unknown to remain compatible with both design-lint and dtif-parser
  // DtifFlattenedToken variants (they diverge on the value field type)
  addToken(pointer: string, token: unknown): void;
}

export type KernelProcessCtor = new (options: KernelOptions) => StartableKernel;

interface ParsedArgs extends KernelOptions {
  configPath?: string;
}

function parseArgs(argv: string[]): ParsedArgs {
  function getArg(flag: string): string | undefined {
    const idx = argv.indexOf(flag);
    return idx !== -1 ? argv[idx + 1] : undefined;
  }

  function hasFlag(flag: string): boolean {
    return argv.includes(flag);
  }

  const socketPath = getArg('--socket-path');
  const httpPortStr = getArg('--http-port');
  const pidFile = getArg('--pid-file');
  const noHttp = hasFlag('--no-http');
  const configPath = getArg('--config-path');

  return {
    socketPath,
    httpPort: httpPortStr !== undefined ? parseInt(httpPortStr, 10) : undefined,
    pidFile,
    enableHttp: !noHttp,
    configPath,
  };
}

async function loadKernelProcess(): Promise<KernelProcessCtor> {
  const mod = await import('@lapidist/dsr');
  // KernelProcess satisfies StartableKernel structurally (start + addToken both present)
  return mod.KernelProcess;
}

/**
 * Bootstrap the kernel with tokens from a design-lint configuration file.
 *
 * Loads the config, parses the DTIF token documents, and injects each
 * flattened token into the kernel via `addToken`. This populates the kernel's
 * token graph so DSQL queries return meaningful results immediately after start.
 *
 * @param configPath - Path to the designlint.config.* file.
 * @param kernel - Running kernel instance to inject tokens into.
 */
async function bootstrapTokens(
  configPath: string,
  kernel: StartableKernel,
): Promise<void> {
  const [
    { loadConfig },
    { ConfigTokenProvider },
    { ensureDtifFlattenedTokens, getDtifFlattenedTokens },
  ] = await Promise.all([
    import('../config/loader.js'),
    import('../config/config-token-provider.js'),
    import('../utils/tokens/dtif-cache.js'),
  ]);

  const config = await loadConfig(process.cwd(), configPath);
  const provider = new ConfigTokenProvider(config);
  // ConfigTokenProvider.load() always returns Record<string, DesignTokens> — never arrays
  const tokensByTheme = await provider.load();

  let injected = 0;
  for (const tokens of Object.values(tokensByTheme)) {
    await ensureDtifFlattenedTokens(tokens);
    const flattened = getDtifFlattenedTokens(tokens);
    if (flattened) {
      for (const token of flattened) {
        kernel.addToken(token.pointer, token);
        injected++;
      }
    }
  }

  console.log(
    `[kernel-daemon] bootstrapped ${injected.toString()} token(s) from config`,
  );
}

/**
 * Start the kernel daemon.
 *
 * Accepts an optional KernelProcess constructor so the function can be tested
 * without spawning a real kernel.
 *
 * @param argv - CLI arguments (defaults to process.argv.slice(2)).
 * @param KernelProcessClass - Optional KernelProcess constructor override.
 */
export async function startDaemon(
  argv = process.argv.slice(2),
  KernelProcessClass?: KernelProcessCtor,
): Promise<void> {
  const { configPath, ...options } = parseArgs(argv);
  const Ctor = KernelProcessClass ?? (await loadKernelProcess());
  const kernel = new Ctor(options);
  await kernel.start();
  console.log(`[kernel-daemon] started (PID ${process.pid.toString()})`);

  if (configPath) {
    try {
      await bootstrapTokens(configPath, kernel);
    } catch (err) {
      console.error(
        `[kernel-daemon] token bootstrap failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

// Run when invoked as a standalone process (not when imported in tests).
if (!process.env.DESIGN_LINT_TEST_MODE) {
  await startDaemon();
}
