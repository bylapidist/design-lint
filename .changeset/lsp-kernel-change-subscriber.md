---
'@lapidist/design-lint': minor
---

Add `KernelChangeSubscriber` to LSP server for targeted re-lint on token graph changes

`LSPServerOptions` now accepts an optional `kernelChangeSubscriber` field
that implements the new `KernelChangeSubscriber` interface. When provided,
the server subscribes to kernel token graph change events and re-lints all
currently-open documents when tokens are added, removed, or deprecated.

This closes the E2 gap from the ADDITIONAL_GAPS2 audit: token graph changes
now trigger targeted document re-lint without requiring a manual file save.
The `KernelChangeSubscriber` type is also re-exported from the server module
for consumers to implement against.
