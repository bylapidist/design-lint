---
title: API and Programmatic Usage
description: "Use design-lint from Node.js scripts or TypeScript projects."
sidebar_position: 9
---

# API and Programmatic Usage

This reference targets developers embedding design-lint in custom tooling.

## Table of contents
- [Quick start](#quick-start)
- [Linter class](#linter-class)
- [Helper functions](#helper-functions)
- [Types](#types)
- [Versioning and stability](#versioning-and-stability)
- [See also](#see-also)

## Quick start
```ts
import {
  loadConfig,
  createLinter,
  getFormatter,
  applyFixes,
  createNodeEnvironment,
} from '@lapidist/design-lint';

async function main() {
  const config = await loadConfig(process.cwd());
  const env = createNodeEnvironment(config);
  const linter = createLinter(config, env);
  const { results } = await linter.lintTargets(['src/**/*.{ts,tsx}'], true);
  const formatter = await getFormatter('stylish');
  console.log(formatter(results));
  const fixed = applyFixes('color: var(--red);', results[0].messages);
  console.log(fixed);
}

main().catch(console.error);
```

## Linter class
`Linter` runs rules against provided documents.

```ts
import { Linter, FileSource } from '@lapidist/design-lint';
const linter = new Linter(config, new FileSource());
const { results } = await linter.lintTargets(['src/**/*.ts']);
```

Key methods:
- `lintTargets(targets, fix?)` – lint files or globs.
- `lintText(text, id, metadata?)` – lint a string.
- `getTokenCompletions()` – list available token paths grouped by theme.

## Helper functions
- `loadConfig(cwd, path?)` – resolve configuration.
- `defineConfig(config)` – provide type checking for config files.
- `getFormatter(name)` – load a formatter by name or path.
- `applyFixes(text, messages)` – apply non-overlapping fixes.
- `registerTokenTransform(transform)` – convert design tokens before validation;
  returns an unregister function.

### Token transforms
Design token objects may originate from sources like Figma or Tokens Studio.
Use `registerTokenTransform()` to supply converters that adapt these formats
to the [W3C Design Tokens specification](./glossary.md#design-tokens).
Transforms run before token normalization and validation.
`parseDesignTokens()` also accepts a `transforms` array for per-call transforms.

## Types
design-lint ships with TypeScript definitions for `Config`, `LintResult`, `RuleModule`, and more:

```ts
import type { Config, LintResult, RuleModule } from '@lapidist/design-lint';
```

## Versioning and stability
The public API follows semantic versioning. Functions documented here are stable. Experimental exports are marked with `@experimental` in the source and may change without notice.

## See also
- [Plugins](./plugins.md)
- [Architecture overview](./architecture.md)
