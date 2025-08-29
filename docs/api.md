# API

`@lapidist/design-lint` exposes a small Node API for advanced scenarios.

```js
import { Linter, loadConfig, getFormatter, defineConfig } from '@lapidist/design-lint';

const config = await loadConfig();
const linter = new Linter(config);
const { results } = await linter.lintFiles(['src']);
const formatter = await getFormatter('stylish');
console.log(formatter(results));
```

## `Linter` ([source](../src/core/engine.ts))

Core engine for linting files and applying rules.

### Constructor

`new Linter(config)`

#### Parameters

- `config` [`Config`](../src/core/engine.ts) – configuration object controlling tokens, rules and plugins.

#### Example

```ts
const config = await loadConfig(process.cwd());
const linter = new Linter(config);
```

### Methods

#### `lintText(text, filePath?)`

Lints a string of code. Optionally provide a `filePath` for accurate reporting and to enable file-type-specific parsing.

##### Parameters

- `text` `string` – source code to lint.
- `filePath?` `string` – optional path used for parsing and reporting.

##### Returns

- `Promise<LintResult>` – lint result for the provided text.

##### Example

```ts
const res = await linter.lintText('const c = "#fff";', 'file.ts');
```

#### `lintFile(filePath, fix?, cache?, ignorePaths?, cacheLocation?)`

Lints a single file on disk.

##### Parameters

- `filePath` `string` – path to the file to lint.
- `fix?` `boolean` – apply autofixes. Defaults to `false`.
- `cache?` `Map` – reuse results between runs.
- `ignorePaths?` `string[]` – additional ignore globs.
- `cacheLocation?` `string` – location to persist cache data.

##### Returns

- `Promise<LintResult>` – lint result for the file.

##### Example

```ts
const res = await linter.lintFile('src/file.ts', true, undefined, ['**/dist/**']);
```

#### `lintFiles(files, fix?, cache?, ignorePaths?, cacheLocation?)`

Lints multiple files or directories.

##### Parameters

- `files` `string[]` – targets to lint.
- `fix?` `boolean` – apply autofixes.
- `cache?` `Map` – reuse results between runs.
- `ignorePaths?` `string[]` – additional ignore globs.
- `cacheLocation?` `string` – location to persist cache data.

##### Returns

- `Promise<{ results: LintResult[]; ignoreFiles: string[] }>` – lint results and ignore files that were honored.

##### Example

```ts
const { results, ignoreFiles } = await linter.lintFiles(['src', 'tests']);
```

## `loadConfig(cwd, configPath?)` ([source](../src/config/loader.ts))

Loads a `designlint.config.*` file and validates its contents.

### Parameters

- `cwd` `string` – directory to search from.
- `configPath?` `string` – explicit path to a config file.

### Returns

- `Promise<Config>` – merged configuration object.

### Example

```ts
const config = await loadConfig(process.cwd());
```

See [Configuration](./configuration.md) for details.

## `defineConfig(config)` ([source](../src/config/define-config.ts))

Helper to provide type checking when writing configuration files.

### Parameters

- `config` `Config` – configuration object.

### Returns

- `Config` – the provided configuration.

### Example

```ts
import { defineConfig } from '@lapidist/design-lint';

export default defineConfig({
  tokens: { colors: { primary: '#ff0000' } },
  rules: { 'design-token/colors': 'error' },
});
```

## `getFormatter(name)` ([source](../src/formatters/index.ts))

Retrieve a formatter by built-in name or module path.

### Parameters

- `name` `string` – `'stylish'`, `'json'`, `'sarif'`, or a path to a formatter module.

### Returns

- `Promise<(results: LintResult[], useColor?: boolean) => string>` – formatter function.

### Examples

```ts
const formatter = await getFormatter('stylish');
console.log(formatter(results));
```

```ts
const formatter = await getFormatter('./minimal-formatter.js');
console.log(formatter(results));
```

See [Formatters](./formatters.md) for built-in options and instructions on adding custom ones, and
[Usage](./usage.md#options) for command‑line equivalents.

## `applyFixes(text, messages)` ([source](../src/core/engine.ts))

Apply autofixes to file contents using message fix data.

### Parameters

- `text` `string` – original source code.
- `messages` `LintMessage[]` – messages containing `fix` entries.

### Returns

- `string` – fixed source code.

### Example

```ts
const fixed = applyFixes(code, res.messages);
```

## `builtInRules` ([source](../src/rules/index.ts))

Array of rule modules bundled with the linter.

Includes:

 - [`colors`](./rules/design-token/colors.md)
- [`line-height`](./rules/design-token/line-height.md)
- [`letter-spacing`](./rules/design-token/letter-spacing.md)
- [`spacing`](./rules/design-token/spacing.md)
- [`duration`](./rules/design-token/duration.md)
 - [`font-size`](./rules/design-token/font-size.md)
 - [`font-family`](./rules/design-token/font-family.md)
- [`component-usage`](./rules/design-system/component-usage.md)
- [`deprecation`](./rules/design-system/deprecation.md)

### Returns

- `RuleModule[]` – list of built-in rules.

### Example

```ts
console.log(builtInRules.map((r) => r.name));
```

