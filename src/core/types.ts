import type ts from 'typescript';

export interface DesignTokens {
  colors?: Record<string, string>;
  spacing?: Record<string, number>;
  zIndex?: Record<string, number>;
  typography?: {
    fontSizes?: Record<string, number | string>;
    fonts?: Record<string, string>;
    lineHeights?: Record<string, number | string>;
    fontWeights?: Record<string, number | string>;
    letterSpacings?: Record<string, number | string>;
  };
  deprecations?: Record<string, { replacement?: string }>;
  [key: string]: unknown;
}

export interface LintMessage {
  ruleId: string;
  message: string;
  severity: 'error' | 'warn';
  line: number;
  column: number;
  fix?: Fix;
}

export interface LintResult {
  filePath: string;
  messages: LintMessage[];
  ruleDescriptions?: Record<string, string>;
}

export interface RuleContext {
  report: (msg: Omit<LintMessage, 'ruleId' | 'severity'>) => void;
  tokens: DesignTokens;
  options?: unknown;
  filePath: string;
}

export interface RuleModule {
  name: string;
  meta: {
    description: string;
  };
  create: (context: RuleContext) => RuleListener;
}

export interface RuleListener {
  onNode?: (node: ts.Node) => void;
  onCSSDeclaration?: (decl: CSSDeclaration) => void;
}

export interface PluginModule {
  rules: RuleModule[];
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
