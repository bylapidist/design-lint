# @lapidist/design-lint-telemetry

## 1.0.0

### Major Changes

- 5c9a371: Initial release of eight new design-lint v8 packages: config-recommended, config-strict, config-ai-agent, testing (RuleTester), telemetry (DLTS v1 SDK + OTel), mcp (AEP v1 types), lsp (LSP capability types), rdk (Rule Development Kit)

### Minor Changes

- 5c9a371: feat!: v8 release — DSR kernel integration, MCP/LSP/telemetry packages, RuleTester, config presets, and RDK; the linter now delegates token resolution to the DSR kernel when running, removing internal token/rule state ownership

### Patch Changes

- 5c9a371: feat(lsp): implement createLSPServer with full LSP over stdio — diagnostics, code actions, completions, hover, and token dependency graph
  feat(rdk): implement runTests runner and watchRule file watcher with CLI bin
  test(telemetry): add 30 tests covering all SDK functions (parseDLTSStream, validateDLTSEvent, aggregateRunEvents, computeEntropyTrend, filterByAgent, groupByRule, createOtelInstrumentation)
  test(mcp): add 23 tests covering all four MCP tool handlers (lint-snippet, token-completions, validate-component, explain-diagnostic)
