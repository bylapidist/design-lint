---
'@lapidist/design-lint': minor
---

Validate AEP version on incoming `lint_snippet` requests

The MCP server now reads an optional `aepVersion` field from
`LintSnippetParams`. When present and not equal to `'1'` the server
returns a structured JSON-RPC error (`-32602`) before any processing
occurs, preventing silent incompatibility with future protocol versions.
