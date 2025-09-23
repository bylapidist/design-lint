---
title: Overview
description: "Welcome to @lapidist/design-lint. Learn how it helps you enforce your design system across projects."
sidebar_position: 1
---

# @lapidist/design-lint

@lapidist/design-lint keeps code and style sheets aligned with your design system. It understands design tokens, knows about modern frameworks, and runs wherever Node.js \>=22 is available. The project exclusively supports the [Design Token Interchange Format (DTIF)](./glossary.md#design-tokens), following the canonical parser and schema maintained by the DTIF project.

## Table of contents
- [Why design-lint?](#why-design-lint)
- [Who is this for?](#who-is-this-for)
- [Use cases](#use-cases)
- [Comparison with generic linters](#comparison-with-generic-linters)
- [Quick navigation](#quick-navigation)
- [What's new](#whats-new)
- [See also](#see-also)

## Why design-lint?
Design decisions often live outside your source tree. design-lint brings those decisions into your build by validating code against centrally managed [design tokens](./glossary.md#design-tokens) and custom rules. You get consistent UI implementation, fewer regressions, and a shared vocabulary between designers and engineers.

## Who is this for?
- **Front-end developers** ensuring components follow the design system.
- **Plugin authors** extending the rule set for their organisation.
- **CI engineers** running lint checks in automated pipelines.
- **Contributors** interested in the internals or adding new features.

## Use cases
- Enforce design-system components and tokens across repositories.
- Validate typography, spacing, and color usage in multiple languages.
- Lint large monorepos with caching and watch mode for quick feedback.

## Comparison with generic linters

| Feature | design-lint | Generic linters |
| --- | --- | --- |
| Token awareness | Built-in token parser and validators | Not provided |
| Multi-language support | JavaScript, TypeScript, style sheets, Vue, Svelte, JSX | Usually language-specific |
| Extensibility | [Rules](./rules/index.md), [formatters](./formatters.md), [plugins](./plugins.md) | Often limited to syntax rules |
| Design-system focus | First-class | Requires custom tooling |


## Quick navigation
- [Get started](./usage.md)
- [Configure the linter](./configuration.md)
- [Explore the API](./api.md)
- [Rule reference](./rules/index.md)
- [Examples](./examples/index.md)

## What's new
See the [CHANGELOG](https://github.com/bylapidist/design-lint/blob/main/CHANGELOG.md) for the latest features and fixes. For guidance on interpreting entries, read the [changelog guide](./changelog-guide.md).

## See also
- [Glossary](./glossary.md)
- [Troubleshooting](./troubleshooting.md)
- [Contributing](https://github.com/bylapidist/design-lint/blob/main/CONTRIBUTING.md)
- [Migration from Style Dictionary](./migration.md)
