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
const linter = initLinter(config, new FileSource());
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
- `parseDtifTokens(input, options?)` – run the canonical DTIF parser on a
  document, URL, or `ParseInput` record and receive flattened pointer tokens.
- `parseInlineDtifTokens(content, options?)` – parse an inline DTIF string or
  buffer with optional virtual URI metadata.
- `parseDtifTokenObject(document, options?)` – serialise an in-memory token
  object and validate it through the DTIF parser.
- `parseDtifTokensFromFile(path, options?)` – parse a DTIF file from disk while
  capturing diagnostics and resolver output.
- `flattenDesignTokens(tokens, options?)` – return canonical flattened DTIF
  entries sourced from the parser cache. Use
  `getTokenPath(token, transform?)` to derive normalized paths for these
  records when emitting path-based identifiers.
- `RuleContext#getDtifTokens(type?, theme?)` – read the canonical DTIF tokens
  that back rule contexts without materializing compatibility views.
- `RuleContext#getTokenPath(token)` – derive the normalized path for a DTIF
  token using the configured name transform.
- `TokenRegistry#getDtifTokenByPointer(pointer, theme?)` /
  `TokenRegistry#getDtifTokenByName(name, theme?)` /
  `TokenRegistry#getDtifTokens(theme?)` – retrieve the cached DTIF entries that
  power the registry when parsing DTIF documents.
- `indexDtifTokens(tokens)` / `createDtifNameIndex(tokens)` – build pointer-
  based lookup maps for flattened DTIF tokens.
- `DtifTokenRegistry(tokensByTheme, options?)` – aggregate flattened DTIF
  tokens by theme with optional name transforms.
- `parseDtifTokensFile(path)` / `readDtifTokensFile(path)` – Node-focused
  helpers that parse DTIF files and either return flattened tokens or the
  parsed `TokenDocument`.
- `DtifTokenParseError` – error type that surfaces canonical DTIF diagnostics
  with file, pointer, and position metadata.

### DTIF parsing helpers
design-lint embeds the
[Lapidist DTIF parser](https://github.com/bylapidist/dtif/blob/main/docs/guides/dtif-parser.md)
to validate documents against the official schema, resolve `$ref` pointers, and
return flattened tokens in declaration order. Use `parseDtifTokens` for
programmatic parsing and `parseDtifTokensFromFile` or the Node adapter helpers
when reading from disk. Each API surfaces the full diagnostic bag from the
parser so tooling can present precise feedback to users.

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
