# API

`@lapidist/design-lint` exposes a small Node API for advanced scenarios.

```js
import { Linter, loadConfig, getFormatter } from '@lapidist/design-lint';

const config = await loadConfig();
const linter = new Linter(config);
const results = await linter.lintFiles(['src']);
const formatter = getFormatter('stylish');
console.log(formatter(results));
```

## Linter methods

### `lintText(text, filePath?)`

Lints a string of code. Optionally provide a `filePath` for accurate
reporting and to enable file-type-specific parsing.

```ts
const res = await linter.lintText('const c = "#fff";', 'file.ts');
```

### `lintFile(filePath, fix?, cache?)`

Lints a single file on disk. Pass `fix` to apply autofixes and an optional
`cache` map to reuse results between runs.

```ts
const res = await linter.lintFile('src/file.ts', true);
```

### `lintFiles(files, fix?, cache?, ignorePaths?)`

Lints multiple files or directories. Returns an array of results along with
any ignore files that were honored.

```ts
const results = await linter.lintFiles(['src', 'tests']);
```

## Exports

- `Linter` – core engine for linting files.
- `loadConfig` – loads a `designlint.config.*` file. See [Configuration](./configuration.md).
- `getFormatter` – retrieves a built-in formatter. See [Usage](./usage.md#options).
- `applyFixes` – apply autofixes to file contents.
- `builtInRules` – array of rule modules bundled with the linter.
