import type ts from 'typescript';
import type { z } from 'zod';
import type { Environment } from './environment.js';

export interface VariableDefinition {
  id: string;
  modes?: Record<string, string | number>;
  aliasOf?: string;
}

/**
 * W3C Design Tokens Format token node.
 */
export interface Token {
  $value: unknown;
  $type?: string;
  $description?: string;
  $extensions?: Record<string, unknown>;
  $deprecated?: boolean | string;
  aliasOf?: string[];
}

/**
 * W3C Design Tokens Format group node.
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
 * Root token group with optional $schema.
 */
export type RootTokenGroup = TokenGroup & { $schema?: string };

/**
 * W3C Design Tokens tree.
 */
export type DesignTokens = RootTokenGroup;

export interface FlattenedToken {
  path: string;
  token: Token;
  loc: { line: number; column: number };
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
