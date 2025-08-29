# @lapidist/design-lint Documentation

`@lapidist/design-lint` helps teams enforce design system rules across JavaScript,
TypeScript and CSS codebases. These docs cover installation, usage and
configuration of the linter. For a high-level look at how the tool works under
the hood, see the [Architecture overview](architecture.md). For help diagnosing
common runtime problems, check the [Troubleshooting guide](troubleshooting.md).

## Getting Started

Requires Node.js 22 or later.

### One-off usage

Run the CLI without installing:

```bash
npx @lapidist/design-lint@latest --help
```

### Local installation

Add the package to your project and use the generated binary:

```bash
npm install --save-dev @lapidist/design-lint
npx design-lint src
# or
pnpm design-lint src
# or
yarn design-lint src
```

Refer to the [Usage](usage.md) guide for all available command line options,
to [Configuration](configuration.md) for setting up design tokens and rules, and
to [Formatters](formatters.md) for output formats and custom formatter
examples.

## CI

See the [CI guide](ci.md) for sample configurations in GitHub Actions and other CI services.

## Rules

- [design-token/colors](rules/design-token/colors.md)
- [design-token/spacing](rules/design-token/spacing.md)
- [design-token/typography](rules/design-token/typography.md)
- [design-system/deprecation](rules/design-system/deprecation.md)
- [design-system/component-usage](rules/design-system/component-usage.md)
