---
title: Glossary
description: "Definitions for common design-lint terms."
sidebar_position: 99
---

# Glossary

Key concepts used throughout the documentation.

## Table of contents
- [Design tokens](#design-tokens)
- [Rule](#rule)
- [Formatter](#formatter)
- [Plugin](#plugin)
- [Linter](#linter)
- [Severity](#severity)
- [See also](#see-also)

## Design tokens
Named values such as colours, spacing, or typography that describe your design system. design-lint uses the [W3C Design Tokens Community Group format](https://design-tokens.github.io/community-group/technical-reports/format/) for all token files and can convert Figma and Tokens Studio exports to that format automatically.

## Rule
A check that validates code against the design system. Rules may be built-in or provided by plugins.

## Formatter
Transforms lint results into a human- or machine-readable report.

## Plugin
An npm package that bundles rules, formatters, or other extensions.

## Linter
The engine that orchestrates parsing, rule execution, and formatting.

## Severity
Indicates the importance of a rule violation: `off`, `warn`, or `error`.

## See also
- [Configuration](./configuration.md)
- [Rule reference](./rules/index.md)
