# design-token/blur

Enforces `blur()` values in `filter` or `backdrop-filter` to match the blur tokens defined in your configuration.

## Configuration

```json
{
  "tokens": {
    "blurs": { "sm": "4px" }
  },
  "rules": { "design-token/blur": "error" }
}
```

## Examples

### Invalid

```css
.box { filter: blur(2px); }
```

### Valid

```css
.box { filter: blur(4px); }
```
