---
title: Glossary
description: "Definitions for common design-lint terms."
sidebar_position: 99
---

# Glossary

Key concepts used throughout the documentation.

## Table of contents
- [Design tokens](#design-tokens)
- [DTIF](#dtif)
- [DSR / DSR kernel](#dsr--dsr-kernel)
- [DSQL](#dsql)
- [Token pointer](#token-pointer)
- [Rule](#rule)
- [Formatter](#formatter)
- [Plugin](#plugin)
- [Linter](#linter)
- [Severity](#severity)
- [See also](#see-also)

## Design tokens
Named values such as colours, spacing, or typography that describe your design system. design-lint uses the [Design Token Interchange Format (DTIF)](https://github.com/bylapidist/dtif) for all token files, validating documents with the canonical parser and schema.

## DTIF
**Design Token Interchange Format** — the open specification design-lint uses to represent token data. DTIF extends the W3C Design Tokens Community Group draft with richer type information and a JSON Pointer-based reference system.

## DSR / DSR kernel
**Design System Runtime** — the long-lived daemon process (`design-lint kernel`) that holds the authoritative token graph in memory. All CLI invocations and editor integrations query the kernel via a Unix socket rather than reloading token files on every run.

## DSQL
**Design System Query Language** — the protocol used by clients (CLI, LSP, MCP) to retrieve token data from a running DSR kernel. Queries are answered from the kernel's in-memory token graph.

## Token pointer
A JSON Pointer string (e.g. `#/color/button/background`) that uniquely identifies a token within a DTIF document. Rules and the DSR kernel use pointers as stable, globally-unique identifiers for tokens.

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
