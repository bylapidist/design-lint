---
'@lapidist/design-lint': minor
---

Add `SnapshotHashProvider` to MCP tool handlers and server

`handleLintSnippet`, `handleValidateComponent`, and `handleRequest` now
accept an optional `SnapshotHashProvider` parameter. When provided, the
resolved hash replaces the `'local'` fallback in
`AepResponseMeta.kernelSnapshotHash`, allowing the MCP server to emit the
authoritative kernel snapshot hash from a running DSR kernel. Falls back to
`'local'` when the provider is absent or returns `undefined`.

`createMCPServer` accepts an optional `MCPServerOptions` second argument
with a `snapshotHashProvider` field to wire this through the stdio transport.
