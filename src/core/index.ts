export { Linter, type Config } from './linter.js';
export { applyFixes } from './apply-fixes.js';
export { Runner } from './runner.js';
export type {
  Environment,
  TokenProvider,
  DocumentSource,
  LintDocument,
} from './environment.js';
export type { PluginLoader, LoadedPlugin } from './plugin-loader.js';
export type { CacheProvider, CacheEntry } from './cache-provider.js';
export type {
  LintResult,
  LintMessage,
  RuleModule,
  RuleContext,
  RuleListener,
  DesignTokens,
  Token,
  TokenGroup,
  LegacyDesignTokens,
  PluginModule,
  CSSDeclaration,
  Fix,
} from './types.js';
export {
  matchToken,
  closestToken,
  extractVarName,
  mergeTokens,
  normalizeTokens,
  flattenDesignTokens,
  type TokenPattern,
  type NormalizedTokens,
  type FlattenedToken,
} from './token-utils.js';
export { parseDesignTokens } from './token-parser.js';
