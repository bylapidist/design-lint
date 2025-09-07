# API

Design Lint exposes a small set of functions and classes for programmatic use in Node.js or browser environments.

## Programmatic overview

A typical control flow when using the library directly:

```ts
import {
  loadConfig,
  Linter,
  getFormatter,
  applyFixes,
} from '@lapidist/design-lint';

async function main() {
  // 1. Load configuration from the current working directory
  const config = await loadConfig(process.cwd());

  // 2. Create a linter instance
  const linter = new Linter(config);

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

#### `new Linter(config)`

- **Parameters**
  - `config: Config` – resolved configuration.
- **Returns** `Linter` instance.

#### `lintFiles(targets, fix?, cache?, additionalIgnorePaths?, cacheLocation?)`

- **Parameters**
  - `targets: string[]` – file paths or glob patterns to lint.
  - `fix = false` – whether to apply automatic fixes.
  - `cache?: Cache` – optional file cache.
  - `additionalIgnorePaths: string[] = []` – extra ignore globs.
  - `cacheLocation?: string` – path where cache data is stored.
- **Returns** `Promise<{ results: LintResult[]; ignoreFiles: string[]; warning?: string; }>`
- **Throws** if reading or parsing files fails.

#### `lintFile(path, fix?, cache?, ignorePaths?, cacheLocation?)`

- **Parameters**
  - `path: string` – path to a single file.
  - Other parameters mirror `lintFiles`.
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
    - `lintText: (text: string, filePath: string) => Promise<LintResult>`

#### `run(targets, fix?, cache?, additionalIgnorePaths?, cacheLocation?)`

- **Parameters**
  - `targets: string[]`
  - `fix = false`
  - `cache?: Cache`
  - `additionalIgnorePaths: string[] = []`
  - `cacheLocation?: string`
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

```ts
import type { RuleModule } from '@lapidist/design-lint';

export const noFooRule: RuleModule = {
  name: 'no-foo',
  meta: { description: 'disallow the value "foo"', recommended: 'warn' },
  create(ctx) {
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
import { Linter } from '@lapidist/design-lint';
import type { Config } from '@lapidist/design-lint';

const config: Config = {
  tokens: { color: ['red', 'blue'] },
  rules: { 'token-colors': 'error' },
};

const linter = new Linter(config);
```

These types allow you to build custom integrations and tooling on top of Design Lint.
