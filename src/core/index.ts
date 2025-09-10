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
  PluginModule,
  CSSDeclaration,
  Fix,
  FlattenedToken,
} from './types.js';
export {
  matchToken,
  closestToken,
  extractVarName,
  flattenDesignTokens,
  getFlattenedTokens,
  type TokenPattern,
} from './token-utils.js';
export { parseDesignTokens } from './token-parser.js';
