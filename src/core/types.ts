import type {
  JsonPointer as DtifJsonPointer,
  TokenDiagnostic as ParserTokenDiagnostic,
  DtifFlattenedToken as ParserFlattenedToken,
  TokenMetadataSnapshot,
  ResolvedTokenView,
} from '@lapidist/dtif-parser';
import type {
  DesignToken as DtifToken,
  DesignTokenInterchangeFormat,
  TokenCollection as DtifCollection,
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
export type TokenMetadata = TokenMetadataSnapshot;

export type TokenResolution = ResolvedTokenView;

export type TokenDiagnostic = ParserTokenDiagnostic;

export interface DtifFlattenedToken extends ParserFlattenedToken {
  metadata: TokenMetadata;
  resolution?: TokenResolution;
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
  options?: TOptions;
  metadata?: Record<string, unknown>;
  sourceId: string;
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
