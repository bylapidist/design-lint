# Architecture

Design Lint orchestrates a source-agnostic pipeline that turns any input into lint results. Rather than operating on files directly, each `DocumentSource` produces **LintDocuments** that describe their origin and media type. Documents are parsed according to `document.type`, evaluated by registered rules, then passed to formatters. The chain below summarises the journey.

- `Scan sources → Create LintDocuments → Parse by document.type → Apply rules → Format results`

Starting with document discovery, a `DocumentSource` enumerates raw content from the environment. Node's implementation scans the filesystem but other sources—such as network APIs or editor buffers—could plug in. The parser layer normalises the document into abstract syntax trees (ASTs) using language-specific adapters: CSS uses PostCSS, JavaScript and TypeScript rely on the TypeScript compiler, and Vue/Svelte single-file components compile before analysis. The **rule engine** traverses the ASTs and records messages, optionally providing fixes. Finally, the **formatter pipeline** transforms collected results into human- or machine-readable output.

## Core modules

### DocumentSource

Provides documents from an environment and defines how they are refreshed. The Node adapter [`FileSource`](https://github.com/bylapidist/design-lint/blob/main/src/adapters/node/file-source.ts) reads from the filesystem. Future integrations could stream documents from IDEs, design tools or remote APIs.

### Parser adapters

Normalise different language parsers behind a common interface. See [`src/core/parsers`](https://github.com/bylapidist/design-lint/tree/main/src/core/parsers).

### Rule engine

Registers rules and coordinates their execution over AST nodes. See [`src/core/linter.ts`](https://github.com/bylapidist/design-lint/blob/main/src/core/linter.ts) and [`src/core/rule-registry.ts`](https://github.com/bylapidist/design-lint/blob/main/src/core/rule-registry.ts).

### Formatter pipeline

Streams lint results through built-in or custom formatters. See [`src/formatters`](https://github.com/bylapidist/design-lint/tree/main/src/formatters).

### PluginLoader

Resolves and loads configuration packages, rules and formatters. The Node adapter [`PluginLoader`](https://github.com/bylapidist/design-lint/blob/main/src/adapters/node/plugin-loader.ts) uses Node's module resolution, with room for runtimes like Deno or Bun.

### CacheProvider

Stores metadata and parsed documents across runs. The Node implementation [`NodeCacheProvider`](https://github.com/bylapidist/design-lint/blob/main/src/adapters/node/node-cache-provider.ts) caches to disk; alternative providers could target cloud storage or in-memory caches.

## Performance considerations

Caching avoids repeated work across runs by storing file metadata and parsed ASTs. The runner processes files concurrently, distributing parsing and rule evaluation across available CPU cores.

See the [Plugin guide](plugins.md) for extending the engine beyond the core modules.
