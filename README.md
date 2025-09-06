<!-- markdownlint-disable MD041 -->
<!-- markdownlint-disable MD033 -->
<div>
  <a href="https://design-lint.lapidist.net/" target="_blank" rel="noopener">
    <img src="logo.svg" alt="Design Lint block grid logo" width="64" height="64" />
  </a>
</div>
<h1>@lapidist/design-lint</h1>
<!-- markdownlint-enable MD033 -->

Linter for design systems in JavaScript, TypeScript, and CSS/SCSS/Sass/Less projects.

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

For more background information, read the [introductory blog post](https://lapidist.net/articles/2025/introducing-lapidist-design-lint/).

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
```

## CLI Usage

Lint files, directories, or glob patterns:

```bash
npx design-lint src
npx design-lint .
npx design-lint "src/**/*.scss"
```

To measure run time, set `DESIGNLINT_PROFILE=1` (see [Environment variables](docs/usage.md#environment-variables)).

Generate a starter configuration:

```bash
npx design-lint init
```

By default this writes `designlint.config.json` to the current directory. If TypeScript is detected, a `designlint.config.ts` file using `defineConfig` is produced instead. Use `--init-format` to choose `js`, `cjs`, `mjs`, `ts`, `mts`, or `json`.

Check the CLI version:

```bash
npx design-lint --version
```

### Options

| Flag | Description |
| --- | --- |
| `--config <path>` | Path to a `designlint.config.*` file. An error is thrown if it cannot be found. |
| `--init-format <format>` | Format for `design-lint init` (`js`, `cjs`, `mjs`, `ts`, `mts`, `json`). |
| `--format <formatter>` | Output format (default `stylish`). Accepts built-in names (`stylish`, `json`, `sarif`) or a path to a custom formatter module. See the [Formatters guide](docs/formatters.md). |
| `--output <file>` | Write report to a file instead of stdout. |
| `--report <file>` | Write JSON results to a file. |
| `--ignore-path <file>` | Load additional ignore patterns from a file. Example: `npx design-lint src --ignore-path .lintignore`. |
| `--concurrency <n>` | Limit the number of files processed in parallel. |
| `--max-warnings <n>` | Maximum number of warnings allowed before exiting with a non-zero code. Use `0` to fail on any warning. |
| `--quiet` | Suppress output and rely on the exit code. |
| `--no-color` | Disable colored output. |
| `--cache` | Enable persistent caching. Example: `npx design-lint src --cache`. |
| `--cache-location <path>` | Path to cache file. Example: `npx design-lint src --cache --cache-location .cache/designlint`. |
| `--watch` | Watch files and re-lint on changes. |
| `--fix` | Automatically fix problems when possible. |
| `--version` | Print the CLI version and exit. |

### Inline disabling

Skip linting for specific lines with comment directives.

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
    borderRadius: { sm: 2 },
    spacing: { sm: 4 },
    shadows: { sm: '0 1px 2px rgba(0,0,0,0.1)' },
    zIndex: { modal: 1000 },
    fontSizes: { base: 16 },
    fonts: { sans: 'Inter, sans-serif' },
  },
  rules: {
    'design-token/colors': 'error',
    'design-token/border-radius': 'error',
    'design-token/box-shadow': 'error',
  },
};
```

For TypeScript, use the `defineConfig` helper:

```ts
import { defineConfig } from '@lapidist/design-lint';

export default defineConfig({
  tokens: {
    colors: { primary: '#ff0000' },
    borderRadius: { sm: 2 },
    spacing: { sm: 4 },
    shadows: { sm: '0 1px 2px rgba(0,0,0,0.1)' },
    zIndex: { modal: 1000 },
    fontSizes: { base: 16 },
    fonts: { sans: 'Inter, sans-serif' },
  },
  rules: {
    'design-token/colors': 'error',
    'design-token/border-radius': 'error',
    'design-token/box-shadow': 'error',
  },
});
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

- Lints JavaScript, TypeScript, and CSS/SCSS/Sass/Less projects, including inline style attributes
- Enforces design tokens for color, spacing, typography, borders, animation, and more
- Validates design system usage and flags deprecated or raw HTML components
- Generates starter configuration in multiple formats
- Pluggable rule and formatter architecture with custom plugin support
- CLI and programmatic APIs with watch mode and persistent caching
- Auto-fixes deprecated tokens and components
- Multiple output formats including stylish, JSON, and SARIF for CI
- Inline comment directives to disable rules when necessary

## Rules

### Design System

- [design-system/component-prefix](docs/rules/design-system/component-prefix.md)
- [design-system/component-usage](docs/rules/design-system/component-usage.md)
- [design-system/deprecation](docs/rules/design-system/deprecation.md)
- [design-system/icon-usage](docs/rules/design-system/icon-usage.md)
- [design-system/import-path](docs/rules/design-system/import-path.md)
- [design-system/no-inline-styles](docs/rules/design-system/no-inline-styles.md)
- [design-system/no-unused-tokens](docs/rules/design-system/no-unused-tokens.md)
- [design-system/variant-prop](docs/rules/design-system/variant-prop.md)

### Design Token

- [design-token/animation](docs/rules/design-token/animation.md)
- [design-token/blur](docs/rules/design-token/blur.md)
- [design-token/border-color](docs/rules/design-token/border-color.md)
- [design-token/border-radius](docs/rules/design-token/border-radius.md)
- [design-token/border-width](docs/rules/design-token/border-width.md)
- [design-token/box-shadow](docs/rules/design-token/box-shadow.md)
- [design-token/colors](docs/rules/design-token/colors.md)
- [design-token/duration](docs/rules/design-token/duration.md)
- [design-token/font-family](docs/rules/design-token/font-family.md)
- [design-token/font-size](docs/rules/design-token/font-size.md)
- [design-token/font-weight](docs/rules/design-token/font-weight.md)
- [design-token/letter-spacing](docs/rules/design-token/letter-spacing.md)
- [design-token/line-height](docs/rules/design-token/line-height.md)
- [design-token/opacity](docs/rules/design-token/opacity.md)
- [design-token/outline](docs/rules/design-token/outline.md)
- [design-token/spacing](docs/rules/design-token/spacing.md)
- [design-token/z-index](docs/rules/design-token/z-index.md)

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

## Created by

<!-- markdownlint-disable MD033 -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="11%">
        <a href="https://lapidist.net/about">
          <img src="https://github.com/brettdorrans.png?size=64" width="64" height="64" style="border-radius:100%;" alt="Brett Dorrans's avatar" /><br />
          Brett Dorrans
        </a>
      </td>
      <td align="left" valign="middle">
        Lead frontend engineer and design systems specialist.<br /><br />
        Website: <a href="https://lapidist.net">lapidist.net</a><br />
        GitHub: <a href="https://github.com/bylapidist">@bylapidist</a>
      </td>
    </tr>
  </tbody>
</table>
<!-- markdownlint-enable MD033 -->
