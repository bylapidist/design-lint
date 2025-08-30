# design-token/opacity

Enforces `opacity` values to match the opacity tokens defined in your configuration.

## Configuration

```json
{
  "tokens": {
    "opacity": { "low": 0.2, "high": 0.8 }
  },
  "rules": { "design-token/opacity": "error" }
}
```

## Examples

### Invalid

```css
.box { opacity: 0.5; }
```

### Valid

```css
.box { opacity: 0.2; }
```
