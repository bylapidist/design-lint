/* c8 ignore start */
export { Linter, type Config } from './linter.js';
export { LintService } from './lint-service.js';
export { setupLinter } from './setup.js';
export { applyFixes } from './apply-fixes.js';
export { Runner } from './runner.js';
export { PluginError, ConfigError } from './errors.js';
export { FILE_TYPE_MAP, defaultPatterns } from './file-types.js';
export type {
  Environment,
  TokenProvider,
  DocumentSource,
  LintDocument,
} from './environment.js';
export type { PluginLoader, LoadedPlugin } from './plugin-loader.js';
export type { PluginMeta } from './plugin-manager.js';
export type { CacheProvider, CacheEntry } from './cache-provider.js';
export type {
  LintResult,
  LintMessage,
  RuleModule,
  RuleContext,
  RuleListener,
  DesignTokens,
  TokenNode,
  TokenCollectionNode,
  PluginModule,
  CSSDeclaration,
  Fix,
  DtifFlattenedToken,
  TokenDiagnostic,
  TokenResolution,
  TokenMetadata,
  ColorFormat,
} from './types.js';
export {
  matchToken,
  closestToken,
  extractVarName,
  flattenDesignTokens,
  getFlattenedTokens,
  normalizePath,
  type TokenPattern,
  type NameTransform,
  type FlattenOptions,
} from '../utils/tokens/index.js';
export {
  parseDtifTokens,
  parseDtifTokensFromFile,
  parseInlineDtifTokens,
  parseDtifTokenObject,
} from './dtif/parse.js';
export type {
  ParseDtifTokensOptions,
  ParseInlineDtifTokensOptions,
  DtifParseResult,
} from './dtif/parse.js';
export {
  indexDtifTokens,
  createDtifNameIndex,
  pointerSegmentsToName,
} from './dtif/token-index.js';
export {
  DtifTokenRegistry,
  type DtifTokenRegistryOptions,
} from './dtif/token-registry.js';
export { TokenRegistry, type TokenRegistryOptions } from './token-registry.js';
/* c8 ignore stop */
