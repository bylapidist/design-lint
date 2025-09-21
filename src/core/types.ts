import type ts from 'typescript';
import type { z } from 'zod';
import type {
  DesignTokenInterchangeFormat,
  DesignToken,
  TokenCollection,
  DeprecationMetadata,
  ExtensionsMap,
  Description,
  OverrideConditions,
} from '@lapidist/dtif-schema';
import type { Environment } from './environment.js';

export interface VariableDefinition {
  id: string;
  modes?: Record<string, string | number>;
}

/**
 * DTIF design token node.
 */
export type Token = DesignToken;

/**
 * DTIF collection node containing nested tokens or collections.
 */
export type TokenGroup = TokenCollection;

/**
 * Root DTIF document.
 */
export type RootTokenGroup = DesignTokenInterchangeFormat;

/**
 * DTIF design token document.
 */
export type DesignTokens = DesignTokenInterchangeFormat;

export interface TokenOverrideFallback {
  ref?: string;
  refPath?: string;
  value?: unknown;
  fallback?: TokenOverrideFallback[];
}

export interface TokenOverride {
  pointer: string;
  path: string;
  conditions: OverrideConditions;
  ref?: string;
  refPath?: string;
  value?: unknown;
  fallback?: TokenOverrideFallback[];
}

export interface FlattenedToken {
  /**
   * Legacy dot-delimited path used by existing rules and formatters.
   */
  path: string;
  /**
   * Canonical JSON Pointer for the token within the DTIF document.
   */
  pointer: string;
  value: unknown;
  /**
   * Ordered fallback candidates resolved after the primary value.
   */
  fallbacks?: unknown[];
  ref?: string;
  type?: string;
  aliases?: string[];
  overrides?: TokenOverride[];
  metadata: {
    description?: Description;
    extensions?: ExtensionsMap;
    deprecated?: DeprecationMetadata;
    lastModified?: string;
    lastUsed?: string;
    usageCount?: number;
    author?: string;
    tags?: string[];
    hash?: string;
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
