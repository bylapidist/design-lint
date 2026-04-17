/** LSP diagnostic severity. */
export type LSPSeverity = 1 | 2 | 3 | 4;

/** Advertised capabilities of the design-lint language server. */
export interface LSPCapabilities {
  diagnostics: true;
  codeActions: true;
  completions: true;
  hover: true;
  tokenDependencyGraph: true;
}

/** A diagnostic surfaced via the LSP `textDocument/publishDiagnostics` notification. */
export interface LSPDiagnostic {
  ruleId: string;
  message: string;
  severity: LSPSeverity;
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  /** Code action kind hint for editors (`quickfix`, `refactor`). */
  codeActionKind?: string;
}

/** A code action returned by `textDocument/codeAction`. */
export interface LSPCodeAction {
  title: string;
  kind: 'quickfix' | 'refactor' | 'source';
  /** URI of the file the edit applies to. */
  documentUri: string;
  /** The text edit to apply. */
  edit: {
    range: {
      start: { line: number; character: number };
      end: { line: number; character: number };
    };
    newText: string;
  };
}

/** A completion item returned by `textDocument/completion`. */
export interface LSPCompletion {
  label: string;
  /** The CSS variable reference or token path inserted on accept. */
  insertText: string;
  /** Resolved value shown in the completion detail panel. */
  detail: string;
  /** Whether this completion is ranked above others for the current property. */
  preselect?: boolean;
}

/** Hover response returned by `textDocument/hover`. */
export interface LSPHover {
  /** DTIF pointer for the token being hovered. */
  pointer: string;
  /** Resolved CSS value. */
  resolvedValue: string;
  /** Deprecation notice if the token is deprecated. */
  deprecationNotice?: string;
  /** Link to the token's documentation. */
  docsUrl?: string;
}

/** Maps each tracked file URI to the DTIF token pointers it references. */
export interface LSPTokenDependencyGraph {
  /** File URI to array of DTIF pointer strings. */
  entries: Record<string, string[]>;
}

/**
 * Subscriber interface for DSR kernel token graph change events.
 * When provided to `createLSPServer`, the server re-lints all affected open
 * documents whenever the design token graph changes in the kernel.
 */
export interface KernelChangeSubscriber {
  /**
   * Register a callback that fires whenever the kernel's token graph changes.
   * The callback receives the DTIF pointers of the changed tokens.
   * Returns an unsubscribe function; call it to clean up on server shutdown.
   */
  onTokensChanged(callback: (changedPointers: string[]) => void): () => void;
}

/** Options for creating the language server. */
export interface LSPServerOptions {
  /** Path to the DSR kernel Unix socket (falls back to HTTP if absent). */
  kernelSocket?: string;
  /** HTTP fallback URL for the DSR kernel. */
  kernelUrl?: string;
  /** Maximum number of files to lint concurrently. */
  concurrency?: number;
  /**
   * When provided, the server subscribes to kernel token graph changes and
   * triggers targeted re-lint of all open documents when tokens are mutated.
   */
  kernelChangeSubscriber?: KernelChangeSubscriber;
}
