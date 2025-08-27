import type ts from 'typescript';

export interface DesignTokens {
  colors?: Record<string, string>;
  spacing?: Record<string, number>;
  typography?: {
    fontSizes?: Record<string, number>;
    fonts?: Record<string, string>;
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
}

export interface LintResult {
  filePath: string;
  messages: LintMessage[];
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

export interface CSSDeclaration {
  prop: string;
  value: string;
  line: number;
  column: number;
}
