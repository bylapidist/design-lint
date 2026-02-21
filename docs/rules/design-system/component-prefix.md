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
> Without `packages` or `components`, the rule applies the prefix check broadly to
> component-like tags. For production usage, scope the rule to your design-system
> imports to reduce false positives.

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
