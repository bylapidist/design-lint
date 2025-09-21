---
"@lapidist/design-lint": patch
---

Patch the DTIF validator shim to rewrite the upstream module to `with { type: 'json' }` imports at load time so TypeScript config compilation and runtime validation both reuse the published implementation without Ajv boilerplate.
