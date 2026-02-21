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

export interface RuleModule<
  TOptions = unknown,
  TContext extends RuleContext<TOptions> = RuleContext<TOptions>,
> {
  name: string;
  meta: {
    description: string;
    category?: string;
    schema?: z.ZodType;
  };
  create(context: TContext): RuleListener;
}

export interface RuleListener {
  onNode?: (node: ts.Node) => void;
  onCSSDeclaration?: (decl: CSSDeclaration) => void;
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
  candidate: string;
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
