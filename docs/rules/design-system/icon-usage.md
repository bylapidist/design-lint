# design-system/icon-usage

Reports raw `<svg>` elements or non-design system icon components.

## Configuration

```json
{
  "rules": {
    "design-system/icon-usage": [
      "error",
      { "substitutions": { "svg": "Icon", "FooIcon": "Icon" } }
    ]
  }
}
```

### Options

- `substitutions` (`Record<string, string>`): map of disallowed icon element or component names to their design system replacements. Keys are matched case-insensitively. Defaults to `{ "svg": "Icon" }`.

## Examples

### Invalid

```tsx
<svg />
<FooIcon />
```

### Valid

```tsx
<Icon />
```
