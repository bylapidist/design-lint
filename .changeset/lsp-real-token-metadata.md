---
'@lapidist/design-lint': minor
---

Expose real token metadata in LSP hover and completions

`Linter` gains a new `getDtifTokenByPath(tokenPath)` method that looks up a
flattened DTIF token by its dot-separated path string (the same format returned
by `getTokenCompletions`).

The LSP server now uses this method in two places:

- **`textDocument/hover`** — `resolvedValue` is the actual token value from the
  DTIF graph (e.g. `#FF0000`) instead of a synthesized `var(--...)` CSS
  variable. The hover card also surfaces the token type and any deprecation
  notice.
- **`textDocument/completion`** — each completion item's `detail` field shows
  the real token value when available, falling back to the CSS variable string
  when the token has no explicit value.

`LSPHover` gains an optional `type` field to carry the DTIF token type string.
