# design-system/deprecation

Flags deprecated tokens or components defined in `tokens.deprecations`. If a replacement is provided, running the linter with `--fix` will automatically substitute the new value.

## Configuration

```json
{
  "tokens": {
    "deprecations": { "old": { "replacement": "new" } }
  },
  "rules": { "design-system/deprecation": "error" }
}
```

No additional options.

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
