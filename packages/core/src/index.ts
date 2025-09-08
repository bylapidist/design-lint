export { Linter, type Config, applyFixes } from './core/linter.js';
export { Runner } from './core/runner.js';
export type { DocumentSource } from './core/document-source.js';
export { FileSource } from './core/file-source.js';
export { loadConfig } from './config/loader.js';
export { defineConfig } from './config/define-config.js';
export { getFormatter } from './formatters/index.js';
export { loadCache, type Cache } from './core/cache.js';
export { loadIgnore } from './core/ignore.js';
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
export {
  matchToken,
  closestToken,
  extractVarName,
  mergeTokens,
  normalizeTokens,
  type TokenPattern,
  type NormalizedTokens,
} from './core/token-utils.js';
export { relFromCwd, realpathIfExists } from './utils/paths.js';
