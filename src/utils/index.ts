/**
 * @packageDocumentation
 *
 * Unified entry point for grouped utility modules.
 *
 * Utilities are exposed as namespaces to keep the API surface organized and
 * collision-free:
 *
 * - `collections` – helpers for working with array-like values.
 * - `color` – functions for parsing and detecting CSS color formats.
 * - `guards` – runtime type guards grouped under `ast`, `data`, and `domain`.
 * - `rules` – helpers for authoring lint rules.
 */
export * as collections from './collections/index.js';
export * as color from './color/index.js';
export { detectColorFormat, namedColors } from './color/color-format.js';
export * as guards from './guards/index.js';
export * as rules from './rules/index.js';
