# Architecture Overview

This document describes the major pieces that power `@lapidist/design-lint`.

## Core Engine

The `Linter` class in [`src/core/engine.ts`](../src/core/engine.ts) drives the
linting process. On construction it registers built-in rules, loads any
configured plugins, and then scans files using glob patterns while honoring
ignore rules. Files are parsed according to their extensions—TypeScript and
JavaScript via the TypeScript compiler, CSS with PostCSS, and single-file
components like Vue or Svelte through their respective parsers. The engine then
executes rule listeners for each relevant AST node or CSS declaration and can
apply fixes when requested.

## Rule Lifecycle

Rules expose a `name`, `meta.description`, and a `create` function. When linting
begins, configuration enables specific rules with a severity and optional
options. The engine calls each rule’s `create` function with a `context`
providing `tokens`, `options`, `filePath`, and a `report` method. The returned
listener hooks (`onNode`, `onCSSDeclaration`, etc.) run as the engine walks the
parsed source. When a rule detects a problem it reports a `LintMessage`; fixes
are collected and applied after all listeners finish.

## Plugin Loading

Plugins extend the rule set by exporting an object like `{ rules: RuleModule[] }`.
During startup the engine resolves each plugin relative to the config file and
uses `require` or dynamic `import` depending on the module type. Each rule is
validated for shape and uniqueness before being added to the rule map. Loading
errors clearly identify the plugin and suggest remediation.

## Configuration Resolution

Configuration is resolved through [`loadConfig`](../src/config/loader.ts). It
searches upward from the current directory for `designlint.config.*` files,
supporting JavaScript, TypeScript (via `ts-node`), JSON, and ESM/CJS variants.
Loaded settings are merged with defaults, validated against a schema, and
returned with absolute paths. The resulting object supplies tokens, rule
settings, plugins, and ignore patterns consumed by the engine.

