---
'@lapidist/design-lint': major
'@lapidist/design-lint-mcp': major
'@lapidist/design-lint-lsp': major
'@lapidist/design-lint-testing': major
'@lapidist/design-lint-config-recommended': major
'@lapidist/design-lint-config-strict': major
'@lapidist/design-lint-config-ai-agent': major
'@lapidist/design-lint-rdk': major
---

v8: DSR kernel integration — remove v7 token fallback, require tokenProvider

`createLinter` and the `Linter` constructor now throw when `Environment.tokenProvider` is absent. The v7 inline-config fallback (`ConfigTokenProvider` loaded silently from `config.tokens`) has been removed from both `setup.ts` and `linter.ts`. Callers must supply a `tokenProvider` — the DSR kernel is the authoritative source.

`DsrOptions.beforeConnect` is a new optional async hook that programmatic callers (LSP, MCP, scripts) can use to auto-start the kernel without depending on the CLI's `prepareEnvironment`.
