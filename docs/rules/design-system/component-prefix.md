---
title: design-system/component-prefix
description: "Enforce a prefix for design system component names."
---

# design-system/component-prefix

## Summary
Enforces a prefix for design system component names. Works with React, Vue, Svelte, and Web Components.

## Configuration
Enable this rule in `designlint.config.*`. See [configuration](../../configuration.md) for details on configuring tokens and rules.

```json
{
  "rules": {
    "design-system/component-prefix": [
      "error",
      { "prefix": "DS" }
    ]
  }
}
```

## Options
- `prefix` (`string`, default: `"DS"`): required prefix for component names.
- `packages` (`string[]`): limit enforcement to imports from specific package specifiers.
- `components` (`string[]`): limit enforcement to specific imported component names.

> [!NOTE]
> This rule only runs when you scope it with `packages` and/or `components`.
> Unscoped configurations produce no diagnostics.

*This rule is auto-fixable for simple JSX identifiers and custom elements only.*

Autofix is intentionally skipped for complex JSX tag names (for example `<UI.Button />`, `<Foo.Bar></Foo.Bar>`, or namespaced tags) because rewriting those forms can change semantics.

## Examples

### Invalid

```tsx
<Button />
```

### Valid

```tsx
<DSButton />
```

## When Not To Use
If your project does not enforce a component prefix, disable this rule.

## Related Rules
- [design-system/component-usage](./component-usage.md)
- [design-system/import-path](./import-path.md)

## See also
- [Configuration](../../configuration.md)
- [Rule index](../index.md)
