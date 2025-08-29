# Usage

Requires Node.js 22 or later.

### One-off usage

```bash
npx @lapidist/design-lint@latest --help
```

### Local usage

Install the package and run it from your project:

```bash
npm install --save-dev @lapidist/design-lint
npx design-lint [files...]
# or
pnpm design-lint [files...]
# or
yarn design-lint [files...]
```

### Initialize configuration

Create a starter `designlint.config.json` with:

```bash
npx design-lint init
```

## Options

- `--config <path>`: Path to a `designlint.config.js` or `.json` file.
- `--format <stylish|json|sarif>`: Output format (default `stylish`).
- `--output <file>`: Write report to a file instead of stdout.
- `--report <file>`: Write JSON results to a file.
- `--ignore-path <file>`: Load additional ignore patterns from a file.  
  Example: `npx design-lint src --ignore-path .lintignore`
- `--concurrency <n>`: Limit the number of files processed in parallel.
- `--max-warnings <n>`: Number of warnings to trigger a non-zero exit code.  
  Example: `npx design-lint src --max-warnings 0`
- `--quiet`: Suppress output and rely on exit code.
- `--no-color`: Disable colored output.
- `--cache`: Enable persistent caching.  
  Example: `npx design-lint src --cache`
- `--watch`: Watch files and re-lint on changes.
- `--fix`: Automatically fix problems when possible.

The command exits with a non-zero code when errors are found, making it suitable for CI workflows.

## Examples

Write a JSON report to a file:

```bash
npx design-lint src --report report.json --format json
```

Re-run lint on file changes:

```bash
npx design-lint src --watch
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
// designlint.config.json
{
  "tokens": {
    "deprecations": { "old": { "replacement": "new" } }
  },
  "rules": { "design-system/deprecation": "error" }
}
```

```css
/* button.css */
.btn { color: old; }
```

```bash
npx design-lint button.css --fix
```

The [`design-system/deprecation`](rules/design-system/deprecation.md) rule replaces `old` with `new` when run with `--fix`.
