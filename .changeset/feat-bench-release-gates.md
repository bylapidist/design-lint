---
'@lapidist/design-lint': patch
---

test(bench): add benchmark suite asserting ROADMAP release gate time bounds

Add tests/bench.test.ts with programmatic assertions for lint_snippet via MCP
(< 50ms), LSP diagnostics via lintDocument (< 100ms), and 10k file workspace
scan (tested at 1000 files / < 1s for equivalent throughput). Tests fail when
the implementation regresses past the required threshold.
