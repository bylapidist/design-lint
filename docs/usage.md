# Usage

Design Lint is distributed as a CLI. Node.js 22 or later is required.

## Running the CLI

```bash
# lint a directory
npx @lapidist/design-lint src

# lint specific files or globs
npx design-lint "src/**/*.scss"
```

Generate a starter configuration:

```bash
npx design-lint init
```

By default a `designlint.config.json` file is created. Use `--init-format` to write `js`, `ts` or other formats.

## Command line options

| Flag | Description |
| ---- | ----------- |
| `--config <path>` | Use an explicit configuration file. |
| `--format <name>` | Select formatter: `stylish` (default), `json`, `sarif` or a module path. |
| `--report <file>` | Write raw JSON results to a file. |
| `--output <file>` | Redirect formatted output. |
| `--ignore-path <file>` | Additional ignore patterns. |
| `--concurrency <n>` | Limit parallel file processing. |
| `--max-warnings <n>` | Exit with error when warnings exceed this number. |
| `--cache` | Enable result caching. |
| `--cache-location <path>` | Custom cache file location. |
| `--watch` | Re-run lint on file changes. |
| `--fix` | Apply safe fixes automatically. |

## Inline disabling

Suppress rules with comments:

```js
// design-lint-disable-next-line
const color = 'red';
```

```css
/* design-lint-disable */
.button { color: red; }
/* design-lint-enable */
```

## Caching

`--cache` stores results in `.designlintcache` and skips unchanged files. Delete the file to reset.

## Exit codes

- `0` – no errors and warnings within `--max-warnings`
- `1` – any error or warnings beyond the threshold

## Further reading

- [Configuration](configuration.md)
- [Formatters](formatters.md)
- [CI integration](ci.md)
