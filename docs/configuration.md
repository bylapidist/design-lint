# Configuration

Design Lint reads options from `designlint.config.*` in your project root. JavaScript and TypeScript configs export an object or use `defineConfig`.

```ts
// designlint.config.ts
import { defineConfig } from '@lapidist/design-lint';

export default defineConfig({
  tokens: {
    colors: { primary: '#ff0000' },
    spacing: { sm: 4, md: 8 }
  },
  rules: {
    'design-token/colors': 'error'
  }
});
```

## Tokens

Tokens describe the design system values available to rules. Supported groups include `colors`, `spacing`, `borderRadius`, `fontSizes`, `zIndex` and more.

The `colors` group lists the palette available to your application. Rules like [`design-token/colors`](rules/design-token/colors.md) compare CSS color values against this palette to prevent unapproved shades.

Spacing scales are represented by the `spacing` group. The [`design-token/spacing`](rules/design-token/spacing.md) rule checks margin and padding declarations so layouts stick to the scale.

Use `borderRadius` to define consistent corner rounding for buttons, cards and other surfaces. [`design-token/border-radius`](rules/design-token/border-radius.md) warns when arbitrary radii are used.

Layering concerns can be expressed with `zIndex` tokens. [`design-token/z-index`](rules/design-token/z-index.md) ensures components only use approved stacking levels.

Tokens may be defined as key–value maps or as pattern arrays for matching CSS variables. Set `wrapTokensWithVar: true` when your tokens already map to custom properties.

```json
{
  "wrapTokensWithVar": true,
  "tokens": { "colors": { "primary": "--color-primary" } }
}
```

## Rule configuration

Each entry in the `rules` section begins with a severity: `'off'` (or `0`) disables a rule, `'warn'` (or `1`) reports a warning, and `'error'` (or `2`) fails the lint run.

To configure rule-specific options, supply an array: `[severity, options]`.

```js
module.exports = {
  rules: {
    'design-token/spacing': ['error', { base: 4 }]
  }
};
```

### Design goals

| Goal | Rule |
| --- | --- |
| Enforce brand palette | [`design-token/colors`](rules/design-token/colors.md) |
| Maintain spacing scale | [`design-token/spacing`](rules/design-token/spacing.md) |
| Restrict stacking levels | [`design-token/z-index`](rules/design-token/z-index.md) |
| Standardize rounded corners | [`design-token/border-radius`](rules/design-token/border-radius.md) |

Additional rules may be supplied by plugins; see [Plugins](plugins.md).

## Plugins

Plugins supply additional rule modules. See [Plugins](plugins.md) for details. List plugin packages under `plugins` and then reference their rules:

```js
module.exports = {
  plugins: ['my-plugin'],
  rules: { 'my-plugin/example': 'warn' }
};
```

## Ignore patterns

Ignore files via `.designlintignore` or the `ignoreFiles` array in the config. Patterns are evaluated after `.gitignore`.

## Troubleshooting

- A rule requiring tokens is enabled but tokens are missing → add the token group or disable the rule.
- Configuration file not found → run `npx design-lint init` to generate one.

See [examples](https://github.com/bylapidist/design-lint/tree/main/docs/examples) for sample configurations.
