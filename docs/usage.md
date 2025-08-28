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

## Options

- `--config <path>`: Path to a `designlint.config.js` or `.json` file.
- `--format <stylish|json|sarif>`: Output format (default `stylish`).
- `--output <file>`: Write report to a file instead of stdout.
- `--report <file>`: Write JSON results to a file.
- `--quiet`: Suppress output and rely on exit code.
- `--no-color`: Disable colored output.
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
