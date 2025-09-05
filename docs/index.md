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
```

Refer to the [Usage](usage.md) guide for all available command line options,
to [Configuration](configuration.md) for setting up design tokens and rules, and
to [Formatters](formatters.md) for output formats and custom formatter
examples.

## CI

See the [CI guide](ci.md) for sample configurations in GitHub Actions and other CI services.

## Rules

### Design System

- [component-prefix](rules/design-system/component-prefix.md)
- [component-usage](rules/design-system/component-usage.md)
- [deprecation](rules/design-system/deprecation.md)
- [icon-usage](rules/design-system/icon-usage.md)
- [import-path](rules/design-system/import-path.md)
- [no-inline-styles](rules/design-system/no-inline-styles.md)
- [no-unused-tokens](rules/design-system/no-unused-tokens.md)
- [variant-prop](rules/design-system/variant-prop.md)

### Design Token

- [animation](rules/design-token/animation.md)
- [blur](rules/design-token/blur.md)
- [border-color](rules/design-token/border-color.md)
- [border-radius](rules/design-token/border-radius.md)
- [border-width](rules/design-token/border-width.md)
- [box-shadow](rules/design-token/box-shadow.md)
- [colors](rules/design-token/colors.md)
- [duration](rules/design-token/duration.md)
- [font-family](rules/design-token/font-family.md)
- [font-size](rules/design-token/font-size.md)
- [font-weight](rules/design-token/font-weight.md)
- [letter-spacing](rules/design-token/letter-spacing.md)
- [line-height](rules/design-token/line-height.md)
- [opacity](rules/design-token/opacity.md)
- [outline](rules/design-token/outline.md)
- [spacing](rules/design-token/spacing.md)
- [z-index](rules/design-token/z-index.md)
