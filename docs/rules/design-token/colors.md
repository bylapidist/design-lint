---
title: design-token/colors
description: "Require color tokens instead of hard-coded values."
---

# design-token/colors

## Summary
Disallows raw color values and enforces the color tokens loaded into the DSR kernel. In addition to CSS declarations, the rule checks string literals and template literals inside TypeScript inline `style` attributes.

## Configuration
Enable the rule in `designlint.config.*`:

```json
{ "rules": { "design-token/colors": "error" } }
```

Tokens are not configured inline. Seed the DSR kernel from a DTIF catalog that includes `color`-type tokens:

```json
{
  "$version": "1.0.0",
  "color": {
    "primary": {
      "$type": "color",
      "$value": { "colorSpace": "srgb", "components": [1, 0, 0], "hex": "#ff0000" }
    },
    "secondary": { "$type": "color", "$ref": "#/color/primary" }
  }
}
```

```bash
design-lint kernel start --config-path designlint.config.json
```

To allow specific raw formats alongside token enforcement, pass options:

```json
{ "rules": { "design-token/colors": ["error", { "allow": ["named"] }] } }
```

## Options
- `allow` (`"hex" | "rgb" | "rgba" | "hsl" | "hsla" | "hwb" | "lab" | "lch" | "color" | "named"`[]): formats that may appear as raw values. Defaults to `[]`.
- `strictReference` (`boolean`): when `true`, token-equivalent raw color literals are reported for the supported static color formats this rule parses (for example `#...`, `rgb(...)`, `hsl(...)`, `hwb(...)`, `lab(...)`, `lch(...)`, `color(...)`, named colors). Token references such as `var(--...)` are still allowed. Defaults to `false`.

This rule is auto-fixable. Matched raw color values are replaced with `var(--token-name)` where the CSS variable name is derived from the matching token's pointer (e.g. `#/color/primary` → `var(--color-primary)`).

### Supported formats
The rule detects and blocks the following color formats unless they are defined as tokens or explicitly allowed:

- Hexadecimal values (e.g., `#ff0000`)
- Functional notations: `rgb()`, `rgba()`, `hsl()`, `hsla()`, `hwb()`, `lab()`, `lch()`, `color()`
- Named colors (e.g., `red`, `rebeccapurple`)

Token values and matched color strings are normalized to lowercase before comparison, making hex colors case-insensitive.

### Enforcement modes
- **Value-equivalence mode** (default): raw literals are allowed when their value exactly matches a configured token value.
- **Strict reference mode** (`strictReference: true`): reports token-equivalent raw literals for supported static formats instead of allowing them by value match.

Strict mode provides stronger design-system guarantees, but it can require broader migrations for existing styles that currently rely on token-equivalent literals.

## Examples

### Invalid

```css
.button { color: #00ff00; }
```

### Valid

```css
.button { color: #ff0000; }
```

```tsx
/* TypeScript inline style — string literals are checked */
<button style={{ color: '#ff0000' }} />
/* CSS variable references are always allowed */
<button style={{ color: 'var(--color-primary)' }} />
```

## When Not To Use
If raw color values are allowed in your project, disable this rule.

## Related Rules
- [design-token/spacing](./spacing.md)
- [design-token/font-size](./font-size.md)

## See also
- [Configuration](../../configuration.md)
- [Rule index](../index.md)
