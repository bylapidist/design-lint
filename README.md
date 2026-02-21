<!-- markdownlint-disable MD041 -->
<!-- markdownlint-disable MD033 -->
<div>
  <a href="https://design-lint.lapidist.net/" target="_blank" rel="noopener">
    <img src="logo.svg" alt="Design Lint block grid logo" width="64" height="64" />
  </a>
</div>
<h1>@lapidist/design-lint</h1>
<!-- markdownlint-enable MD033 -->

[![npm version](https://img.shields.io/npm/v/%40lapidist/design-lint.svg?logo=npm&color=cb3837)](https://www.npmjs.com/package/@lapidist/design-lint)
[![build](https://img.shields.io/github/actions/workflow/status/bylapidist/design-lint/ci.yml?label=CI&logo=github)](https://github.com/bylapidist/design-lint/actions)
[![license](https://img.shields.io/npm/l/%40lapidist/design-lint.svg)](LICENSE)

**@lapidist/design-lint** keeps JavaScript, TypeScript and style sheets aligned with your design system. It validates design tokens, flags unsupported components and offers rich formatting options for continuous integration pipelines. The linter operates solely on the [Design Token Interchange Format (DTIF)](https://github.com/bylapidist/dtif), using the canonical parser and schema as its reference implementation.

> This project is not ready for production use.

## Quick start

**@lapidist/design-lint** requires Node.js ≥22. The commands below either run the linter once via `npx` or install it locally, initialise configuration, and lint your `src` directory. For deeper CLI details, see the [Usage guide](docs/usage.md).

```bash
# run without installing
npx @lapidist/design-lint@latest src

# or add to your project
npm install --save-dev @lapidist/design-lint
npx design-lint init
npx design-lint src
```

See the [Usage guide](docs/usage.md) for the full command reference.

## Why design-lint?

General purpose linters understand code style, not design systems. `@lapidist/design-lint` bridges that gap by enforcing token usage and component conventions across your codebase.

### Token awareness
`@lapidist/design-lint` flags raw values that bypass design tokens, keeping colour, spacing and typography consistent. Learn more in the [rule reference](docs/rules/index.md).

### Auto-fixes
Run with `--fix` to automatically replace deprecated tokens and tidy up your code. See the [usage guide](docs/usage.md) for fix options.

### Broad language support
Lint JavaScript, TypeScript, CSS, SCSS, Sass and Less, including inline styles and tagged template literals.

### Extensible
Extend behaviour with custom rules, formatters, and token transforms for your design system.

| Advantage | @lapidist/design-lint | Generic linters |
| --- | --- | --- |
| Design token validation | ✅ | ❌ |
| Token deprecation warnings | ✅ | ❌ |
| Multi-language style + code linting | ✅ | ⚠️ (varies) |

For more background, read the [introductory blog post](https://lapidist.net/articles/2025/introducing-lapidist-design-lint/).

## Documentation

The complete documentation is available under the [`docs/`](docs) directory and on [design-lint.lapidist.net](https://design-lint.lapidist.net/). See [docs/index.md](docs/index.md) for the documentation landing page.

| Document | Purpose |
| --- | --- |
| [Usage](docs/usage.md) | Explains CLI flags, watch mode and caching. |
| [Configuration](docs/configuration.md) | Details tokens, rule levels and plugin activation. |
| [Rules](docs/rules/index.md) | Provides a rule reference grouped by category. |
| [Formatters](docs/formatters.md) | Describes built-in and custom output formats. |
| [CI](docs/ci.md) | Includes examples for GitHub Actions and other providers. |
| [API](docs/api.md) | Shows programmatic usage with TypeScript types. |
| [Architecture](docs/architecture.md) | Explains how the linter works internally. |

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE)
