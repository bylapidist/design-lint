import type ts from 'typescript';

export interface DesignTokens {
  /** Color tokens. */
  colors?: Record<string, string> | (string | RegExp)[];
  /** Spacing scale tokens. */
  spacing?: Record<string, number> | (string | RegExp)[];
  /** z-index tokens. */
  zIndex?: Record<string, number> | (string | RegExp)[];
  /** Border radius tokens. */
  borderRadius?: Record<string, number | string> | (string | RegExp)[];
  /** Border width tokens. */
  borderWidths?: Record<string, number | string> | (string | RegExp)[];
  /** Box shadow tokens. */
  shadows?: Record<string, string> | (string | RegExp)[];
  /** Motion duration tokens. */
  durations?: Record<string, number | string> | (string | RegExp)[];
  /** Animation tokens. */
  animations?: Record<string, string> | (string | RegExp)[];
  /** Blur tokens. */
  blurs?: Record<string, number | string> | (string | RegExp)[];
  /** Border color tokens. */
  borderColors?: Record<string, string> | (string | RegExp)[];
  /** Opacity tokens. */
  opacity?: Record<string, number | string> | (string | RegExp)[];
  /** Outline tokens. */
  outlines?: Record<string, string> | (string | RegExp)[];
  /** Font size tokens. */
  fontSizes?: Record<string, number | string> | (string | RegExp)[];
  /** Font family tokens. */
  fonts?: Record<string, string> | (string | RegExp)[];
  /** Line height tokens. */
  lineHeights?: Record<string, number | string> | (string | RegExp)[];
  /** Font weight tokens. */
  fontWeights?: Record<string, number | string> | (string | RegExp)[];
  /** Letter spacing tokens. */
  letterSpacings?: Record<string, number | string> | (string | RegExp)[];
  /** Variable definitions. */
  variables?: Record<string, { id: string; value: string | number }>;
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
  tokens: DesignTokens;
  options?: TOptions;
  metadata?: Record<string, unknown>;
  sourceId: string;
}

export interface RuleModule<TOptions = unknown> {
  name: string;
  meta: {
    description: string;
    category?: string;
  };
  create(context: RuleContext<TOptions>): RuleListener;
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
