# Usage

Requires Node.js 22 or later.

## One-off usage

```bash
npx @lapidist/design-lint@latest --help
```

## Local usage

Install the package and run it from your project:

```bash
npm install --save-dev @lapidist/design-lint
npx design-lint [files...]

```

The CLI accepts files, directories, or glob patterns:

```bash
npx design-lint .
npx design-lint "src/**/*.scss"
```

## Initialize configuration

Create a starter config with:

```bash
npx design-lint init
```

By default this writes `designlint.config.json`. If TypeScript is detected in
your project (`tsconfig.json` or a `typescript` dependency), a
`designlint.config.ts` is created instead using the `defineConfig` helper.
Override the format with `--init-format <format>` where `<format>` is one of
`js`, `cjs`, `mjs`, `ts`, `mts`, or `json`.

## Options

- `--config <path>`: Path to a `designlint.config.*` file.
- `--init-format <format>`: Format for `design-lint init` (`js`, `cjs`, `mjs`,
  `ts`, `mts`, `json`).
- `--format <formatter>`: Output format (default `stylish`). Accepts built-in
  names (`stylish`, `json`, `sarif`) or a path to a custom formatter module.
- `--output <file>`: Write report to a file instead of stdout.
- `--report <file>`: Write JSON results to a file.
- `--ignore-path <file>`: Load additional ignore patterns from a file. The
  path must exist; otherwise the CLI exits with an error.
  Example: `npx design-lint src --ignore-path .lintignore`
- `--concurrency <n>`: Limit the number of files processed in parallel.
- `--max-warnings <n>`: Number of warnings to trigger a non-zero exit code.
  Example: `npx design-lint src --max-warnings 0`
- `--quiet`: Suppress output and rely on exit code.
- `--no-color`: Disable colored output.
- `--cache`: Enable persistent caching. Results are stored in the
  default `.designlintcache` file and reused on later runs to skip unchanged
  files. Remove the file to reset the cache.
  Example: `npx design-lint src --cache`
- `--cache-location <path>`: Path to the cache file. Overrides the default
  `.designlintcache` location.
- `--watch`: Watch files and re-lint on changes.
- `--fix`: Automatically fix problems when possible.

## Inline disabling

Skip linting for specific lines with special comments.

Ignore the next line:

```js
// design-lint-disable-next-line
const color = 'red';
```

Disable and re-enable a block:

```css
/* design-lint-disable */
.button { color: red; }
/* design-lint-enable */
```

All rules are disabled within the suppressed region.

## Cache management

When run with `--cache`, results are written to `.designlintcache` by default or
to the path provided by `--cache-location`. Entries are skipped on later runs if
a file's modification time hasn't changed. In watch mode, edits to
configuration, plugins, or ignore files automatically clear the cache. Delete
the cache file to force a full re-lint:

```bash
rm .designlintcache
```

## Exit codes

- **0**: No errors and warnings ≤ `--max-warnings`.
- **1**: Any rule errors or warnings exceeding `--max-warnings`.

These codes allow CI pipelines to fail when issues are found. See [CI usage](#ci-usage) for an example.

## Examples

### CI usage

```yaml
# .github/workflows/lint.yml
steps:
  - uses: actions/checkout@v4
  - run: npx design-lint src --max-warnings 0
```

Write a JSON report to a file:

```bash
npx design-lint src --report report.json --format json
```

Use a custom formatter module:

```bash
npx design-lint src --format ./minimal-formatter.js
```

Re-run lint on file changes:

```bash
npx design-lint src --watch
```

### Vue single-file components

Vue `.vue` files are parsed so both template and script code are linted alongside
`<style>` blocks. Only standard CSS syntax is supported inside `<style>`
sections; preprocessors like Sass or Less must be compiled ahead of time. No
additional configuration is required.

```bash
npx design-lint src/components/App.vue
```

### Svelte style bindings

When linting Svelte components, the linter understands both `style` attributes
and `style:` directives. Declarations like

```svelte
<div style="margin: {5}px; color: {'#fff'}" />
<div style:margin-left={5}px style:color={'#fff'} />
```

are parsed so each individual style is checked against the configured rules.

Flag deprecated tokens or components and automatically replace them with [`design-system/deprecation`](rules/design-system/deprecation.md):

```json
// docs/examples/designlint.config.json
{
  "tokens": {
    "deprecations": { "old": { "replacement": "new" } }
  },
  "rules": { "design-system/deprecation": "error" }
}
```

```css
/* button.css */
.btn {
  color: old;
}
```

```bash
npx design-lint button.css --fix
```

The [`design-system/deprecation`](rules/design-system/deprecation.md) rule replaces `old` with `new` when run with `--fix`.

## Suggestions

Design Lint will suggest the closest token when it encounters a typo:

```text
a.css
  1:1  error  Unexpected spacing var(--space-scale-10o) Did you mean `--space-scale-100`?  design-token/spacing
```

## Environment variables

Set `DESIGNLINT_PROFILE=1` to print how long the initial file scan takes. This can help profile large projects.

```bash
DESIGNLINT_PROFILE=1 npx design-lint src
# Scanned 42 files in 120.34ms
```

## Troubleshooting

### Config file not found

If the CLI reports `Config file not found`, run `npx design-lint init` to create a configuration file.
