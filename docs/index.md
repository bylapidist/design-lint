# @lapidist/design-lint Documentation

`@lapidist/design-lint` helps teams enforce design system rules across JavaScript,
TypeScript and CSS codebases. These docs cover installation, usage and
configuration of the linter.

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

Refer to the [Usage](usage.md) guide for all available command line options and
to [Configuration](configuration.md) for setting up design tokens and rules.

## Rules

- [design-token/colors](rules/design-token/colors.md)
- [design-token/spacing](rules/design-token/spacing.md)
- [design-token/typography](rules/design-token/typography.md)
- [design-system/deprecation](rules/design-system/deprecation.md)
- [design-system/component-usage](rules/design-system/component-usage.md)
