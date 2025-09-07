# design-system/deprecation

## Summary
Flags deprecated tokens or components defined in `tokens.deprecations`. If a replacement is provided, running the linter with `--fix` will automatically substitute the new value.

## Configuration
Enable this rule in `designlint.config.*`. See [configuration](../../configuration.md) for details on configuring tokens and rules.

```json
{
  "tokens": {
    "deprecations": { "old": { "replacement": "new" } }
  },
  "rules": { "design-system/deprecation": "error" }
}
```

## Options
No additional options.

*This rule is auto-fixable.*

## Examples

### Invalid

```css
.button { color: old; }
```

```tsx
<button>Click</button>
```

### Valid

```css
.button { color: new; }
```

```tsx
<NewButton>Click</NewButton>
```

## When Not To Use
If you do not track deprecated tokens or components, disable this rule.

## Related Rules
- [design-system/component-prefix](./component-prefix.md)
- [design-system/component-usage](./component-usage.md)

