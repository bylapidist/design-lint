---
'@lapidist/design-lint-lsp': minor
'@lapidist/design-lint-rdk': minor
'@lapidist/design-lint': patch
'@lapidist/design-lint-telemetry': patch
'@lapidist/design-lint-mcp': patch
---

feat(lsp): implement createLSPServer with full LSP over stdio — diagnostics, code actions, completions, hover, and token dependency graph
feat(rdk): implement runTests runner and watchRule file watcher with CLI bin
test(telemetry): add 30 tests covering all SDK functions (parseDLTSStream, validateDLTSEvent, aggregateRunEvents, computeEntropyTrend, filterByAgent, groupByRule, createOtelInstrumentation)
test(mcp): add 23 tests covering all four MCP tool handlers (lint-snippet, token-completions, validate-component, explain-diagnostic)
