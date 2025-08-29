# design-token/typography

Ensures `font-size` and `font-family` declarations use values from your typography tokens.

## Configuration

```json
{
  "tokens": {
    "typography": {
      "fontSizes": { "base": 16, "lg": 20 },
      "fonts": { "sans": "Inter, sans-serif" }
    }
  },
  "rules": { "design-token/typography": "error" }
}
```

No additional options.

## Examples

**Invalid**

```css
.title { font-size: 18px; }
.title { font-family: 'Arial'; }
```

**Valid**

```css
.title { font-size: 20px; }
.title { font-family: "Inter, sans-serif"; }
```
