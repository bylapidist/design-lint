---
'@lapidist/design-lint': minor
---

Add suppress-directive code actions to the LSP server

For every diagnostic in the open document, the `textDocument/codeAction`
handler now offers two additional `quickfix` code actions:

- **Disable for this line** — appends `// design-lint-disable-line <ruleId>`
  at the end of the diagnostic's line.
- **Disable for this file** — inserts `/* design-lint-disable <ruleId> */` as
  a new first line of the file.

Auto-fix actions (when the rule provides a fix) are still included alongside
the new suppress options.
