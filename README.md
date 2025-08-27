# design-lint

`design-lint` is a pluggable linter for enforcing design system rules in
JavaScript, TypeScript and CSS codebases. It validates design tokens and
component usage to help teams stay consistent with their design system.

## Installation

Install the package locally in your project or run it directly via `npx`.

```bash
npm install --save-dev design-lint
# or
npx design-lint --help
```

## CLI Usage

Lint a project by passing files or directories. By default results are printed
in a human friendly format and the process exits with a non-zero code when
errors are found.

```bash
npx design-lint src
```

### Options

- `--config <path>` – path to a `designlint.config.js` or `.json` file.
- `--format <stylish|json|sarif>` – output format (default `stylish`).
- `--output <file>` – write report to a file instead of stdout.
- `--quiet` – suppress output and rely on the exit code.
- `--fix` – automatically fix problems when possible.

## Configuration

Create a `designlint.config.js` (or `.json`) file in your project root to define
the design tokens and active rules:

```js
module.exports = {
  tokens: {
    colors: { primary: '#ff0000' },
    spacing: { sm: 4 },
    typography: {
      fontSizes: { base: 16 },
      fonts: { sans: 'Inter, sans-serif' },
    },
  },
  rules: {
    'design-token/colors': 'error',
  },
};
```

See the [Usage guide](docs/usage.md) and [Configuration guide](docs/configuration.md)
for a detailed breakdown of available options.

## Features

- Enforce color, spacing, and typography tokens
- Prevent deprecated or raw HTML component usage
- Pluggable rule and formatter architecture
- JSON and SARIF output for CI
- Auto-fix deprecated tokens and components

## Documentation

This repository contains Markdown guides under the [`docs/`](docs) directory.
A full documentation site can be built with:

```bash
npm run docs:build
```

The generated site will be output to `docs/.vitepress/dist`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

