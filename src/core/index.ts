export { Linter, type Config } from './linter';
export { LintService } from './lint-service';
export { setupLinter } from './setup';
export { applyFixes } from './apply-fixes';
export { Runner } from './runner';
export { PluginError, ConfigError } from './errors';
export { FILE_TYPE_MAP, defaultPatterns } from './file-types';
export type {
  Environment,
  TokenProvider,
  DocumentSource,
  LintDocument,
} from './environment';
export type { PluginLoader, LoadedPlugin } from './plugin-loader';
export type { PluginMeta } from './plugin-manager';
export type { CacheProvider, CacheEntry } from './cache-provider';
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
} from './types';
export {
  matchToken,
  closestToken,
  extractVarName,
  flattenDesignTokens,
  getFlattenedTokens,
  type TokenPattern,
} from './token-utils';
export {
  parseDesignTokens,
  getTokenLocation,
  registerTokenTransform,
  type TokenTransform,
} from './parser/index';
