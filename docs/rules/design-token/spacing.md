# design-token/spacing

Enforces a spacing scale so that only configured token values or multiples of a base unit are allowed.

## Configuration

```json
{
  "tokens": { "spacing": { "sm": 4, "md": 8 } },
  "rules": {
    "design-token/spacing": ["error", { "base": 4, "units": ["rem", "vw"] }]
  }
}
```

### Options

- `base` (`number`): values must be multiples of this number. Defaults to `4`.
- `units` (`string[]`): CSS units to validate. Defaults to `['px', 'rem', 'em']`.

Numbers that appear inside CSS functions (e.g., `calc()`, `var()`) are ignored.

## Examples

**Invalid**

```css
.box { margin: 5px; }
```

**Valid**

```css
.box { margin: 8px; }
.box { margin: md; }
.box { margin: calc(100% - 5px); }
.box { margin: var(--space, 5px); }
```
