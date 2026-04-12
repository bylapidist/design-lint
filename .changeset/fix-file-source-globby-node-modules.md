---
'@lapidist/design-lint': patch
---

fix(file-source): exclude node_modules and .git from ignore-file discovery glob to prevent catastrophic directory traversal hang
