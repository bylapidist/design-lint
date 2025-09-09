---
title: Getting Started
description: "Install design-lint, create a config, and lint your first project."
sidebar_position: 2
---

# Getting Started

This guide walks you through installing and running @lapidist/design-lint for the first time. It targets developers new to the tool.

## Table of contents
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Initial configuration](#initial-configuration)
- [Run the linter](#run-the-linter)
- [Fix issues automatically](#fix-issues-automatically)
- [Watch mode and caching](#watch-mode-and-caching)
- [Target files and directories](#target-files-and-directories)
- [Exit codes](#exit-codes)
- [Troubleshooting](#troubleshooting)
- [See also](#see-also)

## Prerequisites
- Node.js \>=22
- A project with source files to lint

Install Node using your preferred version manager and ensure `node --version` returns 22 or higher.

## Installation
Run the linter once without installing it locally:

```bash
npx design-lint .
```

To add design-lint to your project:

```bash
npm install --save-dev @lapidist/design-lint
```

## Initial configuration
Generate a starter configuration file:

```bash
npx design-lint init
```

The command creates `designlint.config.json`. See [configuration](./configuration.md) for all available options.

## Run the linter
Lint all files under `src`:

```bash
npx design-lint "src/**/*"
```

Use quotes around globs to prevent shell expansion. By default the CLI exits with code `1` when errors are found.

## Fix issues automatically
Many rules support auto-fix. Use the `--fix` flag to update files in place:

```bash
npx design-lint "src/**/*" --fix
```

## Watch mode and caching
Use `--watch` to rerun the linter when files change. design-lint caches results to speed up subsequent runs. Cache data lives in `.designlintcache` and is safe to commit to CI caches.

```bash
npx design-lint "src/**/*" --watch
```

> **Tip:** Use watch mode during development and caching in CI to shorten feedback loops.

## Target files and directories
You can pass specific files or directories:

```bash
npx design-lint src/button.tsx styles/*.css
```

## Exit codes
- `0` – no lint errors
- `1` – lint errors or runtime/configuration error

## Troubleshooting
If the CLI fails or reports unexpected results:
- Verify the [configuration](./configuration.md)
- Consult the [troubleshooting guide](./troubleshooting.md)

## See also
- [Configuration](./configuration.md)
- [Rule reference](./rules/index.md)
- [CI integration](./ci.md)
- [Examples](./examples/index.md)
