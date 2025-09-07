# Rules

Design-lint organizes rules into categories. Enable any rule by adding its category and name to your configuration:

```json
{
  "rules": {
    "design-system/component-prefix": "error",
    "design-token/colors": "warn"
  }
}
```

## Design system

Rules that enforce consistent usage of your design system's components and patterns.

| Rule | Description |
| ---- | ----------- |
| [component-prefix](./design-system/component-prefix.md) | Enforces a prefix for design system component names. |
| [component-usage](./design-system/component-usage.md) | Requires design system components instead of raw HTML. |
| [deprecation](./design-system/deprecation.md) | Flags deprecated tokens or components and can auto-fix replacements. |
| [icon-usage](./design-system/icon-usage.md) | Reports raw `<svg>` elements or non-design system icon components. |
| [import-path](./design-system/import-path.md) | Ensures components are imported from specified packages. |
| [no-inline-styles](./design-system/no-inline-styles.md) | Disallows inline `style` or `class` attributes on components. |
| [no-unused-tokens](./design-system/no-unused-tokens.md) | Reports tokens from your config that never appear in linted files. |
| [variant-prop](./design-system/variant-prop.md) | Limits variant props to allowed values. |

## Design token

Rules that ensure only approved design tokens are used for visual styles.

| Rule | Description |
| ---- | ----------- |
| [animation](./design-token/animation.md) | Enforces `animation` values to match configured tokens. |
| [blur](./design-token/blur.md) | Enforces `blur()` values to match blur tokens. |
| [border-color](./design-token/border-color.md) | Enforces `border-color` values to match border color tokens. |
| [border-radius](./design-token/border-radius.md) | Enforces `border-radius` values to match configured tokens. |
| [border-width](./design-token/border-width.md) | Enforces `border-width` values to match border width tokens. |
| [box-shadow](./design-token/box-shadow.md) | Enforces `box-shadow` values to match shadow tokens. |
| [colors](./design-token/colors.md) | Disallows raw color values and enforces color tokens. |
| [duration](./design-token/duration.md) | Enforces transition and animation durations to match tokens. |
| [font-family](./design-token/font-family.md) | Ensures `font-family` declarations use token values. |
| [font-size](./design-token/font-size.md) | Ensures `font-size` declarations use token values. |
| [font-weight](./design-token/font-weight.md) | Enforces `font-weight` values to match tokens. |
| [letter-spacing](./design-token/letter-spacing.md) | Enforces `letter-spacing` values to match tokens. |
| [line-height](./design-token/line-height.md) | Enforces `line-height` values to match tokens. |
| [opacity](./design-token/opacity.md) | Enforces `opacity` values to match tokens. |
| [outline](./design-token/outline.md) | Enforces `outline` values to match tokens. |
| [spacing](./design-token/spacing.md) | Allows only spacing tokens or base-unit multiples. |
| [z-index](./design-token/z-index.md) | Enforces `z-index` values to match tokens. |
