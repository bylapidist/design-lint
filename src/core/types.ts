import type ts from 'typescript';
import type { z } from 'zod';
import type { Environment } from './environment.js';
import type { DtifJsonPointer, DtifSourceLocation } from './dtif/session.js';

export interface VariableDefinition {
  id: string;
  modes?: Record<string, string | number>;
}

/**
 * DTIF design token node.
 */
export interface Token {
  $value?: unknown;
  $ref?: string;
  $type?: string;
  $description?: string;
  $extensions?: Record<string, unknown>;
  $deprecated?: boolean | string;
}

/**
 * DTIF design token group.
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
 * DTIF document root with optional metadata.
 */
export type RootTokenGroup = TokenGroup & {
  $schema?: string;
  $version?: string;
  $overrides?: Record<string, unknown>;
};

/**
 * DTIF design token tree.
 */
export type DesignTokens = RootTokenGroup;

/**
 * DTIF-native token view that uses JSON pointers for identity.
 *
 * @todo Replace usages of {@link FlattenedToken} with this once the DTIF
 * parser pipeline is wired through the linter.
 */
export interface ResolvedTokenView {
  pointer: DtifJsonPointer;
  value: unknown;
  type?: string;
  aliases?: DtifJsonPointer[];
  metadata: {
    description?: string;
    extensions?: Record<string, unknown>;
    deprecated?: boolean | string;
    source?: DtifSourceLocation;
  };
}

/** Legacy flattened view built around dot-separated paths. */
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
