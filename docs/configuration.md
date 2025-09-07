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

Tokens may be defined as key–value maps or as pattern arrays for matching CSS variables. Set `wrapTokensWithVar: true` when your tokens already map to custom properties.

```json
{
  "wrapTokensWithVar": true,
  "tokens": { "colors": { "primary": "--color-primary" } }
}
```

## Rule configuration

Rules are enabled in the `rules` section using either a severity string or an array with options.

```js
module.exports = {
  rules: {
    'design-token/spacing': ['error', { base: 4 }]
  }
};
```

## Plugins

Plugins supply additional rule modules. List plugin packages under `plugins` and then reference their rules:

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

See [examples](examples) for sample configurations.
