---
'@lapidist/design-lint': major
---

- Parse inline DTIF token documents through the canonical parser when using `parseTokensForTheme`, surfacing `TokenParseError` diagnostics for failures.
- Make `normalizeTokens` asynchronous so configuration helpers validate theme records via the DTIF parser.
