---
'@lapidist/design-lint': patch
---

Use configured rule severity in `export-design-system-md`

`export-design-system-md` now reads each rule's severity and enabled state
from the loaded config rather than hardcoding `severity: 'warn'` and
`enabled: true` for all rules. Rules set to `'off'` in config are emitted
with `enabled: false`; rules set to `'error'` are emitted with
`severity: 'error'`.
