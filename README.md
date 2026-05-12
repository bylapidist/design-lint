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

**@lapidist/design-lint** is a Design System Runtime (DSR) for JavaScript, TypeScript, and style sheets. It enforces design token usage, component and import policies, and design system conventions across your entire codebase — backed by a long-lived kernel daemon that holds the authoritative token graph in memory and serves every lint invocation via a Unix socket.

The runtime is built on the [Design Token Interchange Format (DTIF)](https://github.com/bylapidist/dtif) and exposes an [MCP server](packages/mcp/) for AI assistant integration, an [LSP server](packages/lsp/) for editor diagnostics, a [snapshot format](docs/architecture.md) for portable offline use, and a [DSCP document](https://github.com/bylapidist/dscp) generator for AI context (`DESIGN_SYSTEM.md`).

## Quick start

**@lapidist/design-lint** requires Node.js ≥22. The first invocation starts the DSR kernel automatically; subsequent invocations connect to the running kernel.

```bash
# run without installing
npx @lapidist/design-lint@latest src

# or add to your project
pnpm add --save-dev @lapidist/design-lint
npx design-lint init
npx design-lint src
```

See the [Usage guide](docs/usage.md) for the full command reference.

## Why design-lint?

General purpose linters understand code style, not design systems. `@lapidist/design-lint` bridges that gap by enforcing token usage and component conventions across your codebase.

### Token awareness

`@lapidist/design-lint` flags raw values against your configured token constraints to keep colour, spacing, and typography consistent. Some rules (such as `design-token/spacing`) support a `strictReference` option to require CSS variable references rather than matching raw token values. Learn more in the [rule reference](docs/rules/index.md).

### Auto-fixes

Run with `--fix` to apply available rule fixes and tidy up your code. Fix support is rule-specific; not every diagnostic is auto-fixable. See the [usage guide](docs/usage.md) for fix options.

### Broad language support

Lint JavaScript, TypeScript, CSS, SCSS and Less, including inline styles (string attributes and JSX object literals with literal values) and configured tagged template sources. Dynamic inline style expressions remain unsupported. Indented `.sass` files currently report `parse-error` diagnostics.

### Extensible

Extend behaviour with custom rules, formatters, and token path name transforms for your design system.

| Advantage                           | @lapidist/design-lint | Generic linters |
| ----------------------------------- | --------------------- | --------------- |
| Design token validation             | ✅                    | ❌              |
| Token deprecation warnings          | ✅                    | ❌              |
| Multi-language style + code linting | ✅                    | ⚠️ (varies)     |

For more background, read the [introductory blog post](https://lapidist.net/articles/2025/introducing-lapidist-design-lint/).

## Documentation

The complete documentation is available under the [`docs/`](docs) directory and on [design-lint.lapidist.net](https://design-lint.lapidist.net/). See [docs/index.md](docs/index.md) for the documentation landing page.

| Document                               | Purpose                                                          |
| -------------------------------------- | ---------------------------------------------------------------- |
| [Usage](docs/usage.md)                 | CLI flags, watch mode, kernel commands, and caching.             |
| [Configuration](docs/configuration.md) | Rule levels, plugin activation, and ignore patterns.             |
| [Rules](docs/rules/index.md)           | Rule reference grouped by category.                              |
| [Formatters](docs/formatters.md)       | Built-in and custom output formats.                              |
| [Migration](docs/migration.md)         | Upgrading from v7 to v8 (kernel architecture, DTIF tokens).      |
| [Plugins](docs/plugins.md)             | Writing and loading custom rule plugins.                         |
| [Policy](docs/policy.md)               | Centrally-owned guardrails that consumer configs cannot weaken.  |
| [CI](docs/ci.md)                       | GitHub Actions examples and kernel setup for CI environments.    |
| [API](docs/api.md)                     | Programmatic usage with TypeScript types.                        |
| [Architecture](docs/architecture.md)   | How the DSR kernel, token graph, and lint surface work together. |

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE)
