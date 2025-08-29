import type ts from 'typescript';

export interface DesignTokens {
  /** Color tokens. */
  colors?: Record<string, string>;
  /** Spacing scale tokens. */
  spacing?: Record<string, number>;
  /** z-index tokens. */
  zIndex?: Record<string, number>;
  /** Border radius tokens. */
  radii?: Record<string, number | string>;
  /** Border radius tokens (alias). */
  borderRadius?: Record<string, number | string>;
  /** Border width tokens. */
  borderWidths?: Record<string, number | string>;
  /** Border width tokens (alias). */
  borderWidth?: Record<string, number | string>;
  /** Box shadow tokens. */
  shadows?: Record<string, string>;
  /** Motion duration tokens. */
  durations?: Record<string, number | string>;
  /** Motion tokens grouped under motion. */
  motion?: {
    /** Motion duration tokens. */
    durations?: Record<string, number | string>;
  };
  /** Typography-related tokens. */
  typography?: {
    /** Font size tokens. */
    fontSizes?: Record<string, number | string>;
    /** Font family tokens. */
    fonts?: Record<string, string>;
    /** Line height tokens. */
    lineHeights?: Record<string, number | string>;
    /** Font weight tokens. */
    fontWeights?: Record<string, number | string>;
    /** Letter spacing tokens. */
    letterSpacings?: Record<string, number | string>;
  };
  /** Deprecated tokens and their replacements. */
  deprecations?: Record<string, { replacement?: string }>;
  /** Allow additional custom token groups. */
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
