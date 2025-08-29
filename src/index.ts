export { Linter, type Config, applyFixes } from './core/engine.js';
export { loadConfig } from './config/loader.js';
export { getFormatter } from './formatters/index.js';
export { builtInRules } from './rules/index.js';
export type {
  LintResult,
  LintMessage,
  RuleModule,
  RuleContext,
  RuleListener,
  DesignTokens,
  PluginModule,
  CSSDeclaration,
  Fix,
} from './core/types.js';
