# @lapidist/design-lint

`@lapidist/design-lint` is a pluggable linter for enforcing design system rules in
JavaScript, TypeScript, and CSS codebases. It validates design tokens and
component usage to help teams stay consistent with their design system.

## Why?

General-purpose linters like ESLint or Biome focus on code correctness and style,
but they are unaware of your design system. `@lapidist/design-lint` fills that
gap by validating design tokens and component usage so interfaces stay aligned
with shared design guidelines. It works alongside existing tools, adding
design-system-specific rules rather than replacing your current lint setup.

## Installation

Requires Node.js 22 or later.

### One-off usage

Run the CLI without installing it locally:

```bash
npx @lapidist/design-lint@latest --help
```

### Local installation

Install the package and use the generated binary:

```bash
npm install --save-dev @lapidist/design-lint
npx design-lint --help
# or
pnpm design-lint --help
# or
yarn design-lint --help
```

## CLI Usage

Lint a project by passing files or directories. By default, results are printed
in a human-friendly format, and the process exits with a non-zero code when
errors are found.

```bash
npx design-lint src
```

Generate a starter configuration file:

```bash
npx design-lint init
```

This creates a `designlint.config.json` in the current directory.

Check the CLI version:

```bash
npx design-lint --version
```

### Options

- `--config <path>` – path to a `designlint.config.js` or `.json` file. The CLI
  throws an error if the file cannot be found.
- `--format <formatter>` – output format (default `stylish`). Accepts built-in
  names (`stylish`, `json`, `sarif`) or a path to a custom formatter module.
  See the [Formatters guide](docs/formatters.md) for details.
- `--output <file>` – write report to a file instead of stdout.
- `--report <file>` – write JSON results to a file.
- `--ignore-path <file>` – load additional ignore patterns from a file.  
  Example: `npx design-lint src --ignore-path .lintignore`
- `--concurrency <n>` – limit the number of files processed in parallel.
- `--max-warnings <n>` – maximum number of warnings allowed before exiting with a non-zero code. Use `0` to fail on any warning.
  Example: `npx design-lint src --max-warnings 0`
- `--quiet` – suppress output and rely on the exit code.
- `--no-color` – disable colored output.
- `--cache` – enable persistent caching.  
  Example: `npx design-lint src --cache`
- `--watch` – watch files and re-lint on changes.
- `--fix` – automatically fix problems when possible.
- `--version` – print the CLI version and exit.

#### Examples

Write a JSON report to a file:

```bash
npx design-lint src --report report.json --format json
```

Re-run lint on file changes:

```bash
npx design-lint src --watch
```

Automatically replace deprecated tokens or components:

```json
// designlint.config.json
{
  "tokens": { "deprecations": { "old": { "replacement": "new" } } },
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

The [`design-system/deprecation`](docs/rules/design-system/deprecation.md) rule rewrites `old` to `new` when run with `--fix`.

### Vue single-file components

`.vue` files are parsed so both `<script>`/`<template>` code and `<style>` blocks
are linted. Only standard CSS is supported in `<style>` sections; preprocessors
such as Sass or Less must be compiled beforehand. No additional configuration is
required.

```bash
npx design-lint src/components/App.vue
```

## Programmatic Usage

`@lapidist/design-lint` can also run directly in Node.js:

```js
import { Linter, loadConfig, getFormatter } from '@lapidist/design-lint';

const config = await loadConfig();
const linter = new Linter(config);
const { results } = await linter.lintFiles(['src']);
const formatter = await getFormatter('stylish');
console.log(formatter(results));
```

Additional exports, such as `applyFixes` and `builtInRules`, are also available.
See the [Configuration guide](docs/configuration.md) for `loadConfig` details,
the [Formatters guide](docs/formatters.md) for formatter usage, and the
[Usage guide](docs/usage.md#options) for CLI options. A full list of exports is
in the [API guide](docs/api.md).

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

## Plugins

Plugins can supply additional rules. Each plugin should export an object like
`{ rules: RuleModule[] }` and be listed in the `plugins` field of your configuration:

```js
module.exports = {
  plugins: ['my-plugin'],
  rules: {
    'my-plugin/example': 'error',
  },
};
```

If a plugin cannot be loaded or exports the wrong shape, `@lapidist/design-lint`
throws an error during initialization.

See the [Plugin guide](docs/plugins.md) for a step-by-step tutorial on writing and publishing custom rules.

## Features

- Enforce color, spacing, and typography tokens
- Prevent deprecated or raw HTML component usage
- Pluggable rule and formatter architecture
- JSON and SARIF output for CI
- Auto-fix deprecated tokens and components

## Rules

- [design-token/colors](docs/rules/design-token/colors.md)
- [design-token/spacing](docs/rules/design-token/spacing.md)
- [design-token/typography](docs/rules/design-token/typography.md)
- [design-system/deprecation](docs/rules/design-system/deprecation.md)
- [design-system/component-usage](docs/rules/design-system/component-usage.md)

CSS is parsed using [PostCSS](https://postcss.org/). The default parser handles
standard CSS syntax including multi-line declarations. Preprocessor-specific
syntax (such as Sass or Less) is not supported unless transformed before
linting.

## Documentation

This repository contains Markdown guides under the [`docs/`](docs) directory.
For an overview of the core engine, rule lifecycle, plugin system and
configuration resolution, see the [Architecture guide](docs/architecture.md).
A full documentation site can be built with:

```bash
npm run docs:build
```

The generated site will be output to `docs/.vitepress/dist`.

## Security

See [SECURITY.md](SECURITY.md) for information on reporting vulnerabilities.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

This project is released with a [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md).
By participating in this project, you agree to abide by its terms.
