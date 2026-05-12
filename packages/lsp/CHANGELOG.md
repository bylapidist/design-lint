# @lapidist/design-lint-lsp

## 1.0.0

### Major Changes

- 5c9a371: v8: DSR kernel integration — remove v7 token fallback, require tokenProvider

  `createLinter` and the `Linter` constructor now throw when `Environment.tokenProvider` is absent. The v7 inline-config fallback (`ConfigTokenProvider` loaded silently from `config.tokens`) has been removed from both `setup.ts` and `linter.ts`. Callers must supply a `tokenProvider` — the DSR kernel is the authoritative source.

  `DsrOptions.beforeConnect` is a new optional async hook that programmatic callers (LSP, MCP, scripts) can use to auto-start the kernel without depending on the CLI's `prepareEnvironment`.

- 5c9a371: Initial release of eight new design-lint v8 packages: config-recommended, config-strict, config-ai-agent, testing (RuleTester), telemetry (DLTS v1 SDK + OTel), mcp (AEP v1 types), lsp (LSP capability types), rdk (Rule Development Kit)

### Minor Changes

- 5c9a371: feat(lsp): implement createLSPServer with full LSP over stdio — diagnostics, code actions, completions, hover, and token dependency graph
  feat(rdk): implement runTests runner and watchRule file watcher with CLI bin
  test(telemetry): add 30 tests covering all SDK functions (parseDLTSStream, validateDLTSEvent, aggregateRunEvents, computeEntropyTrend, filterByAgent, groupByRule, createOtelInstrumentation)
  test(mcp): add 23 tests covering all four MCP tool handlers (lint-snippet, token-completions, validate-component, explain-diagnostic)
- 5c9a371: feat!: v8 release — DSR kernel integration, MCP/LSP/telemetry packages, RuleTester, config presets, and RDK; the linter now delegates token resolution to the DSR kernel when running, removing internal token/rule state ownership

### Patch Changes

- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [3a76856]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
- Updated dependencies [5c9a371]
  - @lapidist/design-lint@8.0.0
