import type {
  Diagnostic,
  DiagnosticCode,
  JsonPointer as DtifJsonPointer,
  ResolvedToken,
  SourceSpan,
} from '@lapidist/dtif-parser';
import type {
  DeprecationMetadata,
  DesignToken as DtifToken,
  DesignTokenInterchangeFormat,
  ExtensionsMap,
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
export type TokenExtensions = ExtensionsMap;
export type TokenDeprecation = DeprecationMetadata;

export interface TokenLocation {
  uri?: URL;
  pointer?: JsonPointer;
  span?: SourceSpan;
}

export interface TokenMetadata {
  description?: string;
  extensions?: TokenExtensions;
  deprecated?: TokenDeprecation;
  lastModified?: string;
  lastUsed?: string;
  usageCount?: number;
  author?: string;
  tags?: string[];
  hash?: string;
}

export type TokenResolution = Pick<
  ResolvedToken,
  | 'pointer'
  | 'uri'
  | 'type'
  | 'value'
  | 'source'
  | 'overridesApplied'
  | 'warnings'
  | 'trace'
>;

export interface DtifFlattenedToken {
  pointer: JsonPointer;
  segments: readonly string[];
  name: string;
  type?: string;
  value?: unknown;
  metadata: TokenMetadata;
  resolution?: TokenResolution;
  location?: TokenLocation;
}

export interface TokenDiagnosticRelated {
  message: string;
  pointer?: JsonPointer;
  location?: TokenLocation;
}

export interface TokenDiagnostic {
  code: DiagnosticCode;
  message: string;
  severity: Diagnostic['severity'];
  pointer?: JsonPointer;
  location?: TokenLocation;
  related?: readonly TokenDiagnosticRelated[];
}

/**
 * Legacy token node produced by the pre-DTIF parser.
 */
export interface Token {
  $value: unknown;
  $type?: string;
  $description?: string;
  $extensions?: Record<string, unknown>;
  $deprecated?: boolean | string;
}

/**
 * Legacy token group produced by the pre-DTIF parser.
 */
export type TokenGroup = {
  $type?: string;
  $description?: string;
  $extensions?: Record<string, unknown>;
  $deprecated?: boolean | string;
} & {
  [name: string]: TokenGroup | Token | undefined;
};

/**
 * Legacy token root with optional schema reference.
 */
export type RootTokenGroup = TokenGroup & { $schema?: string };

/**
 * Canonical DTIF token document.
 */
export type DesignTokens = TokenDocument;

/**
 * Legacy design tokens tree maintained until the DTIF migration completes.
 *
 * The type remains available for internal compatibility during the DTIF
 * migration but will be removed alongside the legacy parser in a future major
 * release.
 */
export type LegacyDesignTokens = RootTokenGroup;

export interface FlattenedToken {
  path: string;
  value: unknown;
  type?: string;
  aliases?: string[];
  metadata: {
    description?: string;
    extensions?: Record<string, unknown>;
    deprecated?: boolean | string;
    loc: { line: number; column: number };
  };
}

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
  getFlattenedTokens: (type?: string, theme?: string) => FlattenedToken[];
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
