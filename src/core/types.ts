import type {
  DesignToken,
  DesignTokenInterchangeFormat,
  TokenCollection,
  TokenOrCollectionNode,
  DeprecationMetadata,
} from '@lapidist/dtif-schema';
import type ts from 'typescript';
import type { z } from 'zod';
import type { Environment } from './environment.js';

export interface VariableDefinition {
  id: string;
  modes?: Record<string, string | number>;
}

/**
 * DTIF design token node.
 */
export type Token = DesignToken;

type CollectionEntries = {
  [K in string as K extends `$${string}` ? never : K]?: TokenOrCollectionNode;
};

/**
 * DTIF token collection node.
 */
export type TokenGroup = TokenCollection & CollectionEntries;

/**
 * Root DTIF document.
 */
export type RootTokenGroup = DesignTokenInterchangeFormat;

/**
 * DTIF design token tree.
 */
export type DesignTokens = DesignTokenInterchangeFormat;

export interface FlattenedToken {
  path: string;
  value: unknown;
  type?: string;
  /** Canonical JSON Pointer reference when the token aliases another token. */
  ref?: string;
  aliases?: string[];
  metadata: {
    description?: string;
    extensions?: Record<string, unknown>;
    deprecated?: DeprecationMetadata;
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
