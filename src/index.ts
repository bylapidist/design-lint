export { Linter, applyFixes, loadIgnore } from './node-adapter/linter.js';
export type { Config } from './engine/linter.js';
export { Runner } from './engine/runner.js';
export type { DocumentSource } from './engine/document-source.js';
export { FileSource } from './node-adapter/file-source.js';
export { loadConfig } from './config/loader.js';
export { defineConfig } from './config/define-config.js';
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
} from './engine/types.js';
export {
  matchToken,
  closestToken,
  extractVarName,
  mergeTokens,
  normalizeTokens,
  type TokenPattern,
  type NormalizedTokens,
} from './engine/token-utils.js';
