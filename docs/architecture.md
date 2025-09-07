# Architecture

Design Lint orchestrates a pipeline that moves from file discovery to result formatting. It walks the filesystem, parses source
content into abstract syntax trees (ASTs), evaluates registered rules and emits a report through the selected formatter. The fl
ow below shows how data advances through each stage.

```mermaid
flowchart LR
  A[Scan files] --> B[Parse sources]
  B --> C[Apply rules]
  C --> D[Format results]
```

Starting with **file discovery**, glob patterns expand to concrete paths and respect ignore files or configuration. Each file i
s then **parsed** by language‑specific adapters: CSS uses PostCSS, JavaScript and TypeScript rely on the TypeScript compiler, an
d Vue/Svelte single‑file components compile before analysis. The **rule engine** traverses the ASTs and records messages, optio
nally providing fixes. Finally, the **formatter pipeline** transforms collected results into human‑ or machine‑readable output.

## Core modules

### File discovery

Resolves the working set of files using glob patterns and ignore rules. See [`src/core/file-service.ts`](../src/core/file-servi
ce.ts).

### Parser adapters

Normalise different language parsers behind a common interface. See [`src/core/parsers`](../src/core/parsers).

### Rule engine

Registers rules and coordinates their execution over AST nodes. See [`src/core/linter.ts`](../src/core/linter.ts) and [`src/core
/rule-registry.ts`](../src/core/rule-registry.ts).

### Formatter pipeline

Streams lint results through built‑in or custom formatters. See [`src/formatters`](../src/formatters).

## Performance considerations

Caching avoids repeated work across runs by storing file metadata and parsed ASTs. The runner processes files concurrently, dis
tributing parsing and rule evaluation across available CPU cores.

See the [Plugin guide](plugins.md) for extending the engine beyond the core modules.
