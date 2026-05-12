---
'@lapidist/design-lint': minor
---

Track true DTIF token pointers in LSP dependency graph; add targeted re-lint

The `workspace/tokenDependencyGraph` endpoint now records real DTIF pointer
strings (`#/color/brand/primary`) rather than rule IDs as a proxy. Pointers
are extracted from `LintMessage.metadata.pointer` when rules provide them.

The `deprecation` rule now includes `metadata: { pointer }` in every report
so files referencing deprecated tokens are correctly indexed.

The `KernelChangeSubscriber` re-lint logic is now targeted: only documents
that reference at least one of the changed pointers are re-linted. An empty
`changedPointers` array signals full-graph invalidation and re-lints all open
documents. A non-matching pointer set skips documents with no overlap.
