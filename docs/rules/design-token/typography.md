# design-token/typography

Ensures `font-size` and `font-family` declarations use values from your typography tokens.

## Configuration

```json
{
  "tokens": {
    "typography": {
      "fontSizes": { "base": "1rem", "lg": 20 },
      "fonts": { "sans": "Inter, sans-serif" }
    }
  },
  "rules": { "design-token/typography": "error" }
}
```

Font-size tokens may be defined as numbers (interpreted as `px`) or strings
with `px`, `rem`, or `em` units. These units are converted to pixel values for
comparison.

## Examples

**Invalid**

```css
.title { font-size: 18px; }
.title { font-family: 'Arial'; }
```

**Valid**

```css
.title { font-size: 1rem; }
.title { font-size: 20px; }
.title { font-family: "Inter, sans-serif"; }
```
