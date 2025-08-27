# Usage

Install and run **design-lint** to enforce design system rules in your project.

```bash
npx design-lint [files...]
```

## Options

- `--config <path>`: Path to a `designlint.config.js` or `.json` file.
- `--format <stylish|json|sarif>`: Output format (default `stylish`).
- `--output <file>`: Write report to a file instead of stdout.
- `--quiet`: Suppress output and rely on exit code.
- `--fix`: (stub) Automatically fix problems when possible.

The command exits with a non-zero code when errors are found, making it suitable for CI workflows.
