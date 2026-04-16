/** AEP response envelope metadata attached to every tool response. */
export interface AepResponseMeta {
  /** Unique identifier for this tool invocation. */
  runId: string;
  /** Hash of the kernel snapshot used during this invocation. */
  kernelSnapshotHash: string;
  /** AEP protocol version. */
  aepVersion: string;
}

/** File types accepted by the MCP `lint_snippet` tool. */
export type MCPFileType = 'css' | 'tsx' | 'ts' | 'vue' | 'svelte';

/** Reasoning strategy used to rank a token correction. */
export type CorrectionReasoning =
  | 'colour-delta-e'
  | 'numeric-proximity'
  | 'usage-frequency'
  | 'exact';

/** Parameters for the `lint_snippet` MCP tool. */
export interface LintSnippetParams {
  /** Source code snippet to lint. */
  code: string;
  /** File type to lint as. */
  fileType: MCPFileType;
  /** AI agent identifier for telemetry attribution. */
  agentId?: string;
  /** Whether to include ranked correction suggestions in diagnostics. */
  withSuggestions?: boolean;
  /** Maximum number of correction iterations before returning to the caller. */
  iterationDepth?: number;
}

/** Result returned by the `lint_snippet` MCP tool. */
export interface GenerationResult {
  /** Diagnostics produced by the linter. */
  diagnostics: AEPDiagnostic[];
  /** The snippet after high-confidence auto-corrections have been applied. */
  correctedSnippet: string;
  /** Whether all violations were resolved within the iteration budget. */
  converged: boolean;
  /** Number of correction iterations used. */
  iterationsUsed: number;
  /** Number of violations remaining after correction. */
  violationsRemaining: number;
  /** AEP response envelope metadata. */
  meta: AepResponseMeta;
}

/** A single diagnostic returned by the MCP server. */
export interface AEPDiagnostic {
  /** Rule that produced this diagnostic. */
  ruleId: string;
  severity: 'error' | 'warn';
  message: string;
  line: number;
  column: number;
  /** The raw value that triggered the violation. */
  rawValue: string;
  /** A direct correction if one is available. */
  correction: string | null;
  /** Ranked token path suggestions when `withSuggestions` is true. */
  suggestions: RankedCorrection[];
  /** The agent that produced the violating code, if known. */
  agentId?: string;
  /** AEP protocol version. */
  aepVersion: string;
}

/** A ranked token correction suggestion. */
export interface RankedCorrection {
  /** DTIF token pointer path. */
  tokenPath: string;
  /** Resolved CSS value for this token. */
  resolvedValue: string;
  /** Confidence score between 0 and 1. */
  confidence: number;
  /** The reasoning strategy used to rank this suggestion. */
  reasoning: CorrectionReasoning;
}

/** Parameters for the `get_token_completions` MCP tool. */
export interface TokenCompletionParams {
  /** The CSS property to complete for (e.g. `color`, `font-size`). */
  cssProperty: string;
  /** Optional partial value to filter completions. */
  partialValue?: string;
  /** Optional surrounding file context to improve ranking. */
  fileContext?: string;
}

/** A single token completion result. */
export interface TokenCompletion {
  /** DTIF token pointer path. */
  tokenPath: string;
  /** Resolved CSS value. */
  resolvedValue: string;
  /** CSS variable reference (e.g. `var(--color-brand-primary)`). */
  cssVar: string;
  /** Human-readable token name. */
  displayName: string;
}

/** Result returned by the `validate_component_usage` MCP tool. */
export interface ComponentValidationResult {
  /** Whether the component usage is fully compliant. */
  valid: boolean;
  /** Diagnostics for any non-compliant usages. */
  diagnostics: AEPDiagnostic[];
  /** AEP response envelope metadata. */
  meta: AepResponseMeta;
}

/** Explanation of a single diagnostic returned by `explain_diagnostic`. */
export interface DiagnosticExplanation {
  /** The rule id being explained. */
  ruleId: string;
  /** Human-readable explanation of what the rule checks. */
  description: string;
  /** Why this violation matters. */
  rationale: string;
  /** How to fix the violation. */
  fix: string;
  /** Link to the rule documentation. */
  docsUrl?: string;
}
