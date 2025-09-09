# API

Design Lint exposes a small set of functions and classes for programmatic use in Node.js or browser environments.

The framework ships a "core" build with no Node-specific helpers that can be imported via `@lapidist/design-lint/core`.
Environment-specific utilities like `FileSource` or `NodePluginLoader` live under `@lapidist/design-lint/node`.

## Programmatic overview

A typical control flow when using the library directly:

```ts
import {
  loadConfig,
  Linter,
  FileSource,
  getFormatter,
  applyFixes,
} from '@lapidist/design-lint';

async function main() {
  // 1. Load configuration from the current working directory
  const config = await loadConfig(process.cwd());

  // 2. Create a linter instance
  const linter = new Linter(config, new FileSource());

  // 3. Lint files and optionally apply automatic fixes
  const { results } = await linter.lintFiles(['src/**/*.{ts,tsx}'], true);

  // 4. Format and display results
  const formatter = await getFormatter('stylish');
  console.log(formatter(results));

  // 5. Apply fixes to a string of source code
  const fixed = applyFixes('color: var(--red);', results[0].messages);
  console.log(fixed);
}

main().catch((err) => {
  // Handle any errors thrown by the API
  console.error(err);
});
```

### Programmatic use cases

- Integrate token validation into build scripts or custom CLIs
- Power editor extensions that lint the current buffer
- Format or fix files before committing them
- Author custom rules or plugins using the exported types

## API reference

### `loadConfig(cwd, configPath?)`

Resolve and load the configuration used by the linter.

- **Parameters**
  - `cwd: string` – directory in which to search for configuration files.
  - `configPath?: string` – optional explicit path to a configuration file.
- **Returns** `Promise<Config>` – parsed and validated configuration object.
- **Throws** if the file does not exist or the configuration is invalid.

### `defineConfig(config)`

Helper to define a configuration object with type checking.

- **Parameters**
  - `config: Config` – configuration definition.
- **Returns** `Config` – the provided configuration.

### `class Linter`

Lints files using built-in and plugin-provided rules.

#### `new Linter(config, source, loader?, cacheProvider?)`

- **Parameters**
  - `config: Config` – resolved configuration.
  - `source: DocumentSource` – document source used to resolve lint targets.
  - `loader?: PluginLoader` – optional plugin loader.
  - `cacheProvider?: CacheProvider` – optional cache provider.
- **Returns** `Linter` instance.

#### `lintFiles(targets, fix?, additionalIgnorePaths?)`

- **Parameters**
  - `targets: string[]` – file paths or glob patterns to lint.
  - `fix = false` – whether to apply automatic fixes.
  - `additionalIgnorePaths: string[] = []` – extra ignore globs.
- **Returns** `Promise<{ results: LintResult[]; ignoreFiles: string[]; warning?: string; }>`
- **Throws** if reading or parsing files fails.

#### `lintFile(path, fix?, ignorePaths?)`

- **Parameters**
  - `path: string` – path to a single file.
  - `fix = false` – whether to apply automatic fixes.
  - `ignorePaths: string[] = []` – extra ignore globs.
- **Returns** `Promise<LintResult>`
- **Throws** if the file cannot be processed.

#### `getTokenCompletions()`

- **Returns** `Record<string, string[]>` – available token names grouped by type.

#### `getPluginPaths()`

- **Returns** `Promise<string[]>` – resolved paths to configured plugins.

### `applyFixes(text, messages)`

Apply non-overlapping fixes to the given source text.

- **Parameters**
  - `text: string` – original source code.
  - `messages: LintMessage[]` – messages containing optional fix information.
- **Returns** `string` – transformed text with fixes applied.

### `getFormatter(name)`

Retrieve a formatter by name or path.

- **Parameters**
  - `name: string` – formatter identifier or module path.
- **Returns** `Promise<(results: LintResult[], useColor?: boolean) => string>`
- **Throws** if the formatter cannot be resolved.

### `class Runner`

Executes linting tasks with concurrency control.

#### `new Runner(options)`

- **Parameters**
  - `options` – object containing:
    - `config: Config`
    - `tokenTracker: TokenTracker`
    - `lintText: (text: string, sourceId: string, metadata?: Record<string, unknown>) => Promise<LintResult>`
    - `source: DocumentSource`

#### `run(documents, fix?, cache?)`

- **Parameters**
  - `documents: LintDocument[]`
  - `fix = false`
  - `cache?: CacheProvider`
- **Returns** `Promise<{ results: LintResult[]; ignoreFiles: string[]; warning?: string; }>`

### `builtInRules`

Array of bundled `RuleModule` implementations that ship with Design Lint.

## Types

Design Lint ships with comprehensive TypeScript definitions for composing advanced workflows.

```ts
import type {
  Config,
  LintResult,
  LintMessage,
  RuleModule,
  RuleContext,
  RuleListener,
  DesignTokens,
  PluginModule,
  CSSDeclaration,
  Fix,
} from '@lapidist/design-lint';
```

### Custom rule example

Rules receive a `RuleContext` with available design tokens, configuration options, the file path, and optional `metadata` supplied when linting.

```ts
import type { RuleModule } from '@lapidist/design-lint';

export const noFooRule: RuleModule = {
  name: 'no-foo',
  meta: { description: 'disallow the value "foo"', recommended: 'warn' },
  create(ctx) {
    // ctx.metadata contains optional information passed to lintText
    return {
      Declaration(node) {
        if (node.value === 'foo') {
          ctx.report({
            line: node.loc.start.line,
            column: node.loc.start.column,
            message: 'Avoid using foo',
            fix: { range: node.range, text: 'bar' },
          });
        }
      },
    };
  },
};
```

### Dynamic configuration

```ts
import { Linter, FileSource } from '@lapidist/design-lint';
import type { Config } from '@lapidist/design-lint';

const config: Config = {
  tokens: { color: ['red', 'blue'] },
  rules: { 'token-colors': 'error' },
};

const linter = new Linter(config, new FileSource());
```

These types allow you to build custom integrations and tooling on top of Design Lint.
