# @lapidist/design-lint

Linter for design systems in JavaScript, TypeScript, and CSS projects.

[Documentation](docs/usage.md) · [Contributing](CONTRIBUTING.md) · [Code of Conduct](CODE_OF_CONDUCT.md)

## Table of Contents

- [Why design-lint?](#why-design-lint)
- [Installation](#installation)
- [CLI Usage](#cli-usage)
- [Programmatic Usage](#programmatic-usage)
- [Configuration](#configuration)
- [Plugins](#plugins)
- [Features](#features)
- [Rules](#rules)
- [CI](#ci)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)

## Why design-lint?

General purpose linters enforce code style and correctness but know nothing about your design system. `@lapidist/design-lint` keeps interfaces consistent by validating design tokens and component usage alongside your existing tooling.

## Installation

Node.js 22 or later is required.

### One-off usage

Run without adding a dependency:

```bash
npx @lapidist/design-lint@latest --help
```

### Local installation

Install locally and use the generated binary:

```bash
npm install --save-dev @lapidist/design-lint
npx design-lint --help
# or
pnpm design-lint --help
# or
yarn design-lint --help
```

## CLI Usage

Lint files or directories:

```bash
npx design-lint src
```

To measure run time, set `DESIGNLINT_PROFILE=1` (see [Environment variables](docs/usage.md#environment-variables)).

Generate a starter configuration:

```bash
npx design-lint init
```

By default this writes `designlint.config.json` to the current directory. If TypeScript is detected, a `designlint.config.ts` file is produced instead. Use `--init-format` to choose `js`, `cjs`, `mjs`, `ts`, `mts`, or `json`.

Check the CLI version:

```bash
npx design-lint --version
```

### Options

- `--config <path>` – path to a `designlint.config.*` file. An error is thrown if it cannot be found.
- `--init-format <format>` – format for `design-lint init` (`js`, `cjs`, `mjs`, `ts`, `mts`, `json`).
- `--format <formatter>` – output format (default `stylish`). Accepts built-in names (`stylish`, `json`, `sarif`) or a path to a custom formatter module. See the [Formatters guide](docs/formatters.md).
- `--output <file>` – write report to a file instead of stdout.
- `--report <file>` – write JSON results to a file.
- `--ignore-path <file>` – load additional ignore patterns from a file. Example: `npx design-lint src --ignore-path .lintignore`
- `--concurrency <n>` – limit the number of files processed in parallel.
- `--max-warnings <n>` – maximum number of warnings allowed before exiting with a non-zero code. Use `0` to fail on any warning.
- `--quiet` – suppress output and rely on the exit code.
- `--no-color` – disable colored output.
- `--cache` – enable persistent caching. Example: `npx design-lint src --cache`
- `--watch` – watch files and re-lint on changes.
- `--fix` – automatically fix problems when possible.
- `--version` – print the CLI version and exit.

### Examples

Write a JSON report:

```bash
npx design-lint src --report report.json --format json
```

Watch files:

```bash
npx design-lint src --watch
```

Automatically replace deprecated tokens or components:

```json
// docs/examples/designlint.config.json
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

### React, Vue, Svelte, and Web Components

Support for React components, Vue single-file components, Svelte components, and Web Components is documented in the [frameworks guide](docs/frameworks.md).

## Programmatic Usage

Use the Node API directly:

```js
import { Linter, loadConfig, getFormatter } from '@lapidist/design-lint';

const config = await loadConfig();
const linter = new Linter(config);
const { results } = await linter.lintFiles(['src']);
const formatter = await getFormatter('stylish');
console.log(formatter(results));
```

Additional exports such as `applyFixes` and `builtInRules` are documented in the [API guide](docs/api.md).

## Configuration

Create a `designlint.config.js` (or `.json`) file to define design tokens and rules:

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

See the [Usage guide](docs/usage.md) and [Configuration guide](docs/configuration.md) for full details.

## Plugins

Plugins can supply additional rules. Each plugin should export an object like `{ rules: RuleModule[] }` and be listed in the `plugins` field:

```js
module.exports = {
  plugins: ['my-plugin'],
  rules: {
    'my-plugin/example': 'error',
  },
};
```

If a plugin cannot be loaded or exports the wrong shape, `@lapidist/design-lint` throws an initialization error. Learn more in the [Plugin guide](docs/plugins.md).

## Features

- Enforce color, spacing, and typography tokens
- Prevent deprecated or raw HTML component usage
- Pluggable rule and formatter architecture
- JSON and SARIF output for CI
- Auto-fix deprecated tokens and components

## Rules

- [design-token/colors](docs/rules/design-token/colors.md)
- [design-token/line-height](docs/rules/design-token/line-height.md)
- [design-token/spacing](docs/rules/design-token/spacing.md)
- [design-token/typography](docs/rules/design-token/typography.md)
- [design-system/deprecation](docs/rules/design-system/deprecation.md)
- [design-system/component-usage](docs/rules/design-system/component-usage.md)

CSS is parsed using [PostCSS](https://postcss.org/) and supports standard syntax, including multi-line declarations. Preprocessor-specific syntax (such as Sass or Less) must be transformed before linting.

## CI

See the [CI guide](docs/ci.md) for examples of running the linter in GitHub Actions and other CI systems.

## Documentation

Markdown guides live under the [`docs/`](docs) directory. For an overview of the core engine, rule lifecycle, plugin system, and configuration resolution, see the [Architecture guide](docs/architecture.md). Common runtime issues are covered in the [Troubleshooting guide](docs/troubleshooting.md).

A static documentation site can be built with:

```bash
npm run docs:build
```

The generated site is output to `docs/.vitepress/dist`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

This project is released with a [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project, you agree to abide by its terms.

## Security

See [SECURITY.md](SECURITY.md) for information on reporting vulnerabilities.

## License

[MIT](LICENSE)

