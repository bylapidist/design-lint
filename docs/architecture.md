---
title: Architecture Overview
description: 'Understand the internals of design-lint and how it processes files.'
sidebar_position: 8
---

# Architecture Overview

This overview targets contributors and advanced users who want to understand how design-lint works under the hood.

## Table of contents

- [Processing flow](#processing-flow)
- [Environment model](#environment-model)
- [Core modules](#core-modules)
- [Performance and caching](#performance-and-caching)
- [Contributing to core](#contributing-to-core)
- [See also](#see-also)

## Processing flow

Files pass through a series of stages:

```text
Scan sources → Create documents → Parse → Run rules → Format results
```

Each stage is extensible through plugins or custom environments.

## Environment model

The `Environment` abstraction hides platform concerns. The default Node environment bundles a file-based `DocumentSource`, module resolution, disk caching, and token loading. Other environments can provide equivalents for editors, build tools, or cloud services.

## Core modules

### DocumentSource

Supplies raw text to the linter. The Node adapter [`FileSource`](https://github.com/bylapidist/design-lint/blob/main/src/adapters/node/file-source.ts) reads from disk.

### Parser adapters

Convert documents into ASTs. CSS uses PostCSS, JavaScript and TypeScript rely on the TypeScript compiler, and Vue/Svelte files compile before analysis. See [`src/core/parsers`](https://github.com/bylapidist/design-lint/tree/main/src/core/parsers).

### Rule engine

Registers rules and coordinates execution. See [`src/core/linter.ts`](https://github.com/bylapidist/design-lint/blob/main/src/core/linter.ts) and [`src/core/rule-registry.ts`](https://github.com/bylapidist/design-lint/blob/main/src/core/rule-registry.ts).

### Formatter pipeline

Transforms collected results into human- or machine-readable output. Implementations live under [`src/formatters`](https://github.com/bylapidist/design-lint/tree/main/src/formatters).

### Plugin loader

Resolves configuration packages, rules, and formatters. The Node implementation is [`src/adapters/node/plugin-loader.ts`](https://github.com/bylapidist/design-lint/blob/main/src/adapters/node/plugin-loader.ts).

### Cache provider

Stores metadata and parsed documents across runs. [`src/adapters/node/node-cache-provider.ts`](https://github.com/bylapidist/design-lint/blob/main/src/adapters/node/node-cache-provider.ts) caches to disk.

### Token provider

Supplies design tokens to rules. [`src/adapters/node/token-provider.ts`](https://github.com/bylapidist/design-lint/blob/main/src/adapters/node/token-provider.ts) normalises tokens from configuration.

## Performance and caching

design-lint processes files concurrently across CPU cores. Parsed documents and rule results are cached between runs in `.designlintcache` to reduce work.

## Contributing to core

To work on design-lint itself, read [CONTRIBUTING.md](https://github.com/bylapidist/design-lint/blob/main/CONTRIBUTING.md). It covers the testing and build process, commit guidelines, and release workflow.

## See also

- [API reference](./api.md)
- [Plugins](./plugins.md)
