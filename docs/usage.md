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
- [Autofix workflow](#autofix-workflow)
- [Export resolved tokens](#export-resolved-tokens)
- [Generate token outputs](#generate-token-outputs)
- [Watch mode and caching](#watch-mode-and-caching)
- [Target files and directories](#target-files-and-directories)
- [Exit codes](#exit-codes)
- [Troubleshooting](#troubleshooting)
- [Next steps](#next-steps)

## Prerequisites
- Node.js \>=22
- A project with source files to lint

Install Node using your preferred version manager and ensure `node --version` returns 22 or higher.

## Installation
Run the linter once without installing it locally:

```bash
npx design-lint .
```

For long-term use, install design-lint as a development dependency. This keeps your team on the same version and allows custom configuration:

```bash
npm install --save-dev @lapidist/design-lint
```

Use `npx` for ad-hoc checks or CI where the package is not yet installed. For projects committing to design-lint, prefer a local installation so the binary is available via `npm scripts`.

```json
{
  "scripts": {
    "lint:design": "design-lint"
  }
}
```

Run `npm run lint:design` to invoke the linter using the project-local version.

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

## Autofix workflow
Many rules support auto-fix. Use the `--fix` flag to update files in place:

```bash
npx design-lint "src/**/*" --fix
```

Run `--fix` locally before committing to keep diffs small and intentional. In CI environments, avoid `--fix`; instead run design-lint in read-only mode and fail the build if fixes are required. There is currently no dry-run mode for previewing changes.

## Export resolved tokens
Use the `tokens` subcommand to write flattened tokens to a file or stdout. Alias references are resolved and metadata like `$extensions` is preserved:

```bash
npx design-lint tokens --out tokens.json
```

Use `--theme` to export tokens for a specific theme.

## Generate token outputs
Use the `generate` subcommand to produce CSS variables, JavaScript constants or TypeScript declarations as defined by the `output` configuration.

```bash
npx design-lint generate
```

Pass `--watch` to regenerate when token files or the configuration change.

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

## Next steps
- [Configuration](./configuration.md)
- [Rule reference](./rules/index.md)
- [CI integration](./ci.md)
- [Examples](./examples/index.md)
