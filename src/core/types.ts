import type { JsonPointer as DtifJsonPointer } from '@lapidist/dtif-parser';
import type {
  Token as DtifToken,
  DesignTokenInterchangeFormat,
  TokenMemberMap as DtifCollection,
} from '@lapidist/dtif-schema';
import type ts from 'typescript';
import type { z } from 'zod';
import type { Environment } from './environment.js';

export interface VariableDefinition {
  id: string;
  modes?: Record<string, string | number>;
}

export type JsonPointer = DtifJsonPointer;

export type TokenDocument = DesignTokenInterchangeFormat;
export type TokenNode = DtifToken;
export type TokenCollectionNode = DtifCollection;
export interface TokenMetadata {
  description?: string;
  extensions: Record<string, unknown>;
  deprecated?: TokenDeprecation;
  source?: {
    uri: string;
    line: number;
    column: number;
  };
}

export interface TokenDeprecation {
  since?: string;
  reason?: string;
  supersededBy?: TokenPointer;
}

export interface TokenPointer {
  uri: string;
  pointer: JsonPointer;
}

export interface TokenResolution {
  id: string;
  type?: string;
  value?: unknown;
  raw?: unknown;
  references: readonly TokenPointer[];
  resolutionPath: readonly TokenPointer[];
  appliedAliases: readonly TokenPointer[];
}

export interface DtifFlattenedToken {
  id: string;
  pointer: JsonPointer;
  path: readonly string[];
  name: string;
  type?: string;
  value?: unknown;
  raw?: unknown;
  metadata: TokenMetadata;
  resolution?: TokenResolution;
}

export interface TokenPosition {
  line: number;
  character: number;
}

export interface TokenRange {
  start: TokenPosition;
  end: TokenPosition;
}

export interface TokenDiagnosticTarget {
  uri: string;
  range?: TokenRange;
  pointer?: JsonPointer;
}

export interface TokenDiagnosticRelatedInformation {
  message: string;
  target: TokenDiagnosticTarget;
}

export interface TokenDiagnostic {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  source: 'dtif-parser';
  target: TokenDiagnosticTarget;
  related?: readonly TokenDiagnosticRelatedInformation[];
}

/**
 * Canonical DTIF token document.
 */
export type DesignTokens = TokenDocument;

export interface LintMessage {
  ruleId: string;
  message: string;
  severity: 'error' | 'warn';
  line: number;
  column: number;
  fix?: Fix;
  suggest?: string;
  metadata?: Record<string, unknown>;
}

export interface LintResult {
  sourceId: string;
  messages: LintMessage[];
  ruleDescriptions?: Record<string, string>;
  ruleCategories?: Record<string, string>;
}

export interface RuleContext<TOptions = unknown> {
  report: (msg: Omit<LintMessage, 'ruleId' | 'severity'>) => void;
  getDtifTokens: (type?: string, theme?: string) => DtifFlattenedToken[];
  /**
   * Derive the normalized token path for a DTIF flattened token using the
   * runtime name transform configured for the linter.
   */
  getTokenPath: (token: DtifFlattenedToken) => string;
  symbolResolution?: RuleSymbolResolutionHelpers;
  options?: TOptions;
  metadata?: Record<string, unknown>;
  sourceId: string;
}

export interface RuleSymbolResolutionHelpers {
  getSymbolAtLocation: (node: ts.Node) => ts.Symbol | undefined;
  getAliasedSymbol: (symbol: ts.Symbol) => ts.Symbol;
  resolveSymbol: (node: ts.Node) => ts.Symbol | undefined;
  getSymbolName: (node: ts.Node) => string | undefined;
}

export type RuleEdit =
  | { type: 'replace'; range: [number, number]; text: string }
  | { type: 'insert'; offset: number; text: string }
  | { type: 'delete'; range: [number, number] };

export interface FixContext<TOptions = unknown> {
  sourceId: string;
  text: string;
  options?: TOptions;
  metadata?: Record<string, unknown>;
}

export interface RuleMeta {
  description: string;
  category?: string;
  fixable?: 'code' | 'tokens' | null;
  stability?: 'stable' | 'experimental' | 'deprecated';
  rationale?: {
    why: string;
    owner?: string;
    exceptions?: string;
    since?: string;
  };
  schema?: z.ZodType;
  capabilities?: RuleCapabilities;
}

export interface RuleModule<
  TOptions = unknown,
  TContext extends RuleContext<TOptions> = RuleContext<TOptions>,
> {
  name: string;
  meta: RuleMeta;
  create(context: TContext): RuleListener;
  createRun?(context: RuleRunContext<TOptions>): RuleRunListener;
  fix?(ctx: FixContext<TOptions>): RuleEdit[];
}

export interface RuleCapabilities {
  tokenUsage?: boolean;
}

export interface RuleListener {
  onNode?: (node: ts.Node) => void;
  onCSSDeclaration?: (decl: CSSDeclaration) => void;
}

export interface RuleRunContext<TOptions = unknown> {
  report: (msg: Omit<LintMessage, 'ruleId' | 'severity'>) => void;
  options?: TOptions;
  metadata?: Record<string, unknown>;
  sourceId: string;
  tokenUsage: TokenUsageTracker;
}

export interface RuleRunListener {
  onRunComplete?: () => void | Promise<void>;
}

export interface TokenUsageTracker {
  trackUsage: (input: {
    text: string;
    references?: readonly TokenReferenceCandidate[];
  }) => Promise<void>;
  getUnusedTokens: (ignored?: readonly string[]) => Promise<UnusedToken[]>;
}

export interface UnusedToken {
  value: string;
  path: string;
  pointer: JsonPointer;
  deprecated?: TokenDeprecation;
  extensions: Record<string, unknown>;
}

export interface RegisteredRuleListener {
  ruleId: string;
  listener: RuleListener;
}

export interface PluginModule {
  name?: string;
  version?: string;
  rules: RuleModule[];
  init?(env: Environment): void | Promise<void>;
}

export interface CSSDeclaration {
  prop: string;
  value: string;
  line: number;
  column: number;
}

export interface TokenReferenceCandidate {
  kind: 'css-var' | 'token-path' | 'alias-pointer';
  identity: string;
  line: number;
  column: number;
  context: string;
}

export interface Fix {
  range: [number, number];
  text: string;
}

/**
 * Supported CSS color formats.
 */
export type ColorFormat =
  | 'hex'
  | 'rgb'
  | 'rgba'
  | 'hsl'
  | 'hsla'
  | 'hwb'
  | 'lab'
  | 'lch'
  | 'color'
  | 'named';

// ---------------------------------------------------------------------------
// Policy
// ---------------------------------------------------------------------------

export type PolicySeverity = 'error' | 'warn';

/**
 * Agent-specific policy constraints applied during AI-assisted code generation.
 */
export interface AgentPolicy {
  /** Maximum allowed violation rate (violations per file). */
  maxViolationRate: number;
  /** Whether agent sessions must converge to zero violations. */
  requiredConvergence: boolean;
  /** Agent ids exempt from policy enforcement. */
  trustedAgents: string[];
}

/**
 * Ratchet configuration — prevents entropy from increasing over time.
 */
export interface PolicyRatchet {
  /** Whether to enforce by entropy score or by raw violation count. */
  mode: 'entropy' | 'metric';
  /** Maximum allowed entropy delta between runs. */
  maxDelta?: number;
  /** Minimum acceptable entropy score (0–100). */
  minScore?: number;
}

/**
 * Shape of `designlint.policy.json` — a centrally-owned policy file that
 * downstream configs cannot weaken. Published as a package and consumed by
 * all child workspaces.
 */
export interface DesignLintPolicy {
  /** Other policy files to extend. Merged left-to-right. */
  extends?: string[];
  /** Rule ids that must be enabled in every consumer config. */
  requiredRules: string[];
  /** Minimum severity for specific rules — consumers cannot lower these. */
  minSeverity: Record<string, PolicySeverity>;
  /** Minimum token coverage ratios per DTIF token type (0–1). */
  tokenCoverage: Partial<Record<string, number>>;
  /** AI agent-specific constraints. */
  agentPolicy?: AgentPolicy;
  /** Ratchet settings to prevent design-system entropy from increasing. */
  ratchet: PolicyRatchet;
}
