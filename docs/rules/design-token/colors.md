---
title: design-token/colors
description: "Require color tokens instead of hard-coded values."
---

# design-token/colors

## Summary
Disallows raw color values and enforces the color tokens defined in your configuration.

## Configuration
Enable the rule in `designlint.config.*`. See [configuration](../../configuration.md) for defining tokens.

```json
{
  "tokens": { "colors": { "primary": "#ff0000" } },
  "rules": {
    "design-token/colors": ["error", { "allow": ["named"] }]
  }
}
```

## Options
- `allow` (`"hex" | "rgb" | "rgba" | "hsl" | "hsla" | "hwb" | "lab" | "lch" | "color" | "named"`[]): formats that may appear as raw values. Defaults to `[]`.

This rule is not auto-fixable.

### Supported formats
The rule detects and blocks the following color formats unless they are defined as tokens or explicitly allowed:

- Hexadecimal values (e.g., `#ff0000`)
- Functional notations: `rgb()`, `rgba()`, `hsl()`, `hsla()`, `hwb()`, `lab()`, `lch()`, `color()`
- Named colors (e.g., `red`, `rebeccapurple`)

Token values and matched color strings are normalized to lowercase before comparison, making hex colors case-insensitive.

## Examples

### Invalid

```css
.button { color: #00ff00; }
```

### Valid

```css
.button { color: #ff0000; }
```

## When Not To Use
If raw color values are allowed in your project, disable this rule.

## Related Rules
- [design-token/spacing](./spacing.md)
- [design-token/font-size](./font-size.md)

## See also
- [Configuration](../../configuration.md)
- [Rule index](../index.md)
