---
title: Rule Reference
description: 'Complete list of design-lint rules grouped by category.'
sidebar_position: 4
---

# Rule Reference

Rules enforce your design system. This reference targets developers configuring rule behaviour or writing custom rules.

## Table of contents

- [Token Validation](#token-validation)
- [Component Usage](#component-usage)
- [Styling](#styling)
- [Misc](#misc)
- [Adding or deprecating rules](#adding-or-deprecating-rules)
- [See also](#see-also)

## Token Validation

Validate usage of design tokens in code and style sheets.

- [design-token/animation](./design-token/animation.md)
- [design-token/blur](./design-token/blur.md)
- [design-token/border-color](./design-token/border-color.md)
- [design-token/border-radius](./design-token/border-radius.md)
- [design-token/border-width](./design-token/border-width.md)
- [design-token/box-shadow](./design-token/box-shadow.md)
- [design-token/colors](./design-token/colors.md)
- [design-token/duration](./design-token/duration.md)
- [design-token/font-family](./design-token/font-family.md)
- [design-token/font-size](./design-token/font-size.md)
- [design-token/font-weight](./design-token/font-weight.md)
- [design-token/letter-spacing](./design-token/letter-spacing.md)
- [design-token/line-height](./design-token/line-height.md)
- [design-token/opacity](./design-token/opacity.md)
- [design-token/outline](./design-token/outline.md)
- [design-token/spacing](./design-token/spacing.md)
- [design-token/z-index](./design-token/z-index.md)

## Component Usage

Ensure components follow naming and usage conventions.

- [design-system/component-prefix](./design-system/component-prefix.md)
- [design-system/component-usage](./design-system/component-usage.md)
- [design-system/import-path](./design-system/import-path.md)
- [design-system/icon-usage](./design-system/icon-usage.md)
- [design-system/variant-prop](./design-system/variant-prop.md)

## Styling

Rules that govern styles inside components.

- [design-system/no-inline-styles](./design-system/no-inline-styles.md)

## Misc

Additional checks for maintainability.

- [design-system/deprecation](./design-system/deprecation.md)
- [design-system/no-unused-tokens](./design-system/no-unused-tokens.md)

## Adding or deprecating rules

To propose a new rule or retire an existing one, open an issue or pull request following the guidelines in [CONTRIBUTING.md](https://github.com/bylapidist/design-lint/blob/main/CONTRIBUTING.md). Include rationale, examples, and implementation notes. Deprecated rules should remain in the documentation until removed in a major release.

## See also

- [Configuration](../configuration.md)
- [Plugins](../plugins.md)
