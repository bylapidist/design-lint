---
'@lapidist/design-lint': minor
---

- Swap the unmaintained `json-ptr` dependency for `@hyperjump/json-pointer` while preserving canonical DTIF fragment encoding.
- Update pointer helpers to layer URI fragment encoding/decoding atop the shared library escapes so validation stays aligned with parser semantics and existing edge-case tests.
