/**
 * @packageDocumentation
 *
 * Runtime type guard utilities grouped by domain.
 *
 * - `ast` – guards for TypeScript AST nodes and JSX contexts.
 * - `data` – guards for plain JavaScript data structures.
 * - `domain` – guards for design tokens and lint rule modules.
 */
export * from './ast/index.js';
export * from './data/index.js';
export * from './domain/index.js';

export * as ast from './ast/index.js';
export * as data from './data/index.js';
export * as domain from './domain/index.js';
