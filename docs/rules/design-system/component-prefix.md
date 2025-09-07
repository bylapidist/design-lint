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

*This rule is auto-fixable.*

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
