# design-token/font-size

Ensures `font-size` declarations use values from your `fontSizes` tokens.

## Configuration

```json
{
  "tokens": {
    "fontSizes": { "base": "1rem", "lg": 20 },
    "fonts": { "sans": "Inter, sans-serif" }
  },
  "rules": { "design-token/font-size": "error" }
}
```

Font-size tokens may be defined as numbers (interpreted as `px`) or strings
with `px`, `rem`, or `em` units. These units are converted to pixel values for
comparison.

## Examples

### Invalid

```css
.title { font-size: 18px; }
```

### Valid

```css
.title { font-size: 1rem; }
.title { font-size: 20px; }
```
