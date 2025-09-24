---
'@lapidist/design-lint': major
---

Remove `TokenRegistry#getToken` and `TokenRegistry#getTokens`, relying on the
DTIF registry APIs for lookups while rule contexts derive flattened token views
from the canonical DTIF cache.
