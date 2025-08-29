# design-token/font-family

Ensures `font-family` declarations use values from your typography `fonts` tokens.

## Configuration

```json
{
  "tokens": {
    "typography": {
      "fontSizes": { "base": 16, "lg": 24 },
      "fonts": { "sans": "Inter, sans-serif" }
    }
  },
  "rules": { "design-token/font-family": "error" }
}
```

## Examples

### Invalid

```css
.title { font-family: 'Arial'; }
```

### Valid

```css
.title { font-family: "Inter, sans-serif"; }
```
