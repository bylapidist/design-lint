/**
 * @packageDocumentation
 *
 * Unified entry point for formatter helpers and bundled implementations.
 *
 * Formatters are exposed both as named exports and as namespaces to mirror the
 * layout of {@link ../utils}. The following submodules are available:
 *
 * - `json` – machine-readable JSON output
 * - `sarif` – [SARIF](https://sarifweb.azurewebsites.net/) log generator
 * - `stylish` – human-friendly text formatter
 * - `helpers` – utilities such as {@link getFormatter} and
 *   {@link isBuiltInFormatterName}, including the {@link builtInFormatters} map
 *   and {@link BuiltInFormatterName} type
 */
export {
  getFormatter,
  resolveFormatter,
  isFormatter,
  builtInFormatters,
  isBuiltInFormatterName,
  type Formatter,
  type BuiltInFormatterName,
} from './get-formatter/index.js';
export * as helpers from './get-formatter/index.js';

export { jsonFormatter } from './json/index.js';
export { sarifFormatter } from './sarif/index.js';
export { stylishFormatter } from './stylish/index.js';

export * as json from './json/index.js';
export * as sarif from './sarif/index.js';
export * as stylish from './stylish/index.js';
