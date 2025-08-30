# Configuration

Create a `designlint.config.js` (or `.ts`, `.mjs`, `.mts`, `.json`) file in your project root.

For JavaScript:

```js
module.exports = {
  tokens: {
    colors: { primary: '#ff0000' },
    radii: { sm: 2, md: 4 },
    spacing: { sm: 4, md: 8 },
    shadows: { sm: '0 1px 2px rgba(0,0,0,0.1)' },
    zIndex: { modal: 1000 },
    fontSizes: { base: 16 },
    fonts: { sans: 'Inter, sans-serif' },
  },
  rules: {
    'design-token/colors': 'error',
    'design-token/border-radius': 'error',
    'design-token/box-shadow': 'error',
  },
};
```

For TypeScript, construct the config with `defineConfig`:

```ts
import { defineConfig } from '@lapidist/design-lint';

export default defineConfig({
  tokens: {
    colors: { primary: '#ff0000' },
    radii: { sm: 2, md: 4 },
    spacing: { sm: 4, md: 8 },
    shadows: { sm: '0 1px 2px rgba(0,0,0,0.1)' },
    zIndex: { modal: 1000 },
    fontSizes: { base: 16 },
    fonts: { sans: 'Inter, sans-serif' },
  },
  rules: {
    'design-token/colors': 'error',
    'design-token/border-radius': 'error',
    'design-token/box-shadow': 'error',
  },
});
```

## Token definitions

`@lapidist/design-lint` expects tokens to use specific formats:

- **radii** / **borderRadius**: numbers or strings with `px`, `rem`, or `em` units. Numbers are treated as `px`.
- **borderWidths** / **borderWidth**: numbers or strings with `px`, `rem`, or `em` units. Numbers are treated as `px`.
- **shadows**: strings representing complete `box-shadow` declarations.
- **durations** or **motion.durations**: numbers (milliseconds) or strings with `ms` or `s` units.

```js
module.exports = {
  tokens: {
    radii: { sm: 2, lg: '8px' },
    borderWidths: { thin: 1, thick: '2px' },
    shadows: { sm: '0 1px 2px rgba(0,0,0,0.1)' },
    durations: { short: 100 },
    motion: { durations: { long: '250ms' } },
  },
};
```

See [design-token/colors](rules/design-token/colors.md), [design-token/line-height](rules/design-token/line-height.md), [design-token/font-weight](rules/design-token/font-weight.md), [design-token/letter-spacing](rules/design-token/letter-spacing.md), [design-token/border-radius](rules/design-token/border-radius.md), [design-token/border-width](rules/design-token/border-width.md), [design-token/spacing](rules/design-token/spacing.md), [design-token/box-shadow](rules/design-token/box-shadow.md), [design-token/duration](rules/design-token/duration.md), [design-token/z-index](rules/design-token/z-index.md), [design-token/font-size](rules/design-token/font-size.md), and [design-token/font-family](rules/design-token/font-family.md) for rule details.

@lapidist/design-lint searches for configuration starting from the current working
directory and walking up parent directories. In each directory it looks for
`designlint.config.js`, `designlint.config.cjs`, `designlint.config.mjs`,
`designlint.config.ts`, `designlint.config.mts`, then
`designlint.config.json`. The first file found is used. Loading TypeScript
config files requires [`tsx`](https://tsx.is/) to be
installed. When a configuration path is explicitly provided (for example via
`loadConfig(cwd, 'path')` or the CLI `--config` flag) and the file does not
exist, the linter throws an error.

If the discovered configuration file contains invalid JSON or JavaScript,
@lapidist/design-lint will throw an error including the file path and the underlying
syntax message.

## Fields

- `tokens`: Design token definitions such as colors, spacing, typography, and more.
- `rules`: Map of rule name to severity or `[severity, options]`.
- `ignoreFiles`: Glob patterns to exclude from linting.
- `plugins`: Additional plugin packages to load.
- `concurrency`: Maximum number of files processed concurrently. Defaults to the number of CPU cores.
- `patterns`: Glob patterns used to search for files. Defaults to `['**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs,css,svelte,vue}']`.

### Token dependencies

Several rules rely on specific token categories. Enabling one of these rules
without providing the corresponding tokens results in a configuration warning:

- `design-token/colors` requires `tokens.colors`
- `design-token/spacing` requires `tokens.spacing`
- `design-token/border-radius` requires `tokens.radii` or `tokens.borderRadius`
- `design-token/border-width` requires `tokens.borderWidths` or `tokens.borderWidth`
- `design-token/box-shadow` requires `tokens.shadows`
- `design-token/duration` requires `tokens.durations` or `tokens.motion.durations`
- `design-token/line-height` requires `tokens.lineHeights`
- `design-token/font-weight` requires `tokens.fontWeights`
- `design-token/letter-spacing` requires `tokens.letterSpacings`
- `design-token/z-index` requires `tokens.zIndex`
- `design-token/font-size` requires `tokens.fontSizes`
- `design-token/font-family` requires `tokens.fonts`
- `design-system/deprecation` requires `tokens.deprecations`

To resolve the warning, supply the necessary tokens or disable the rule.

### Token deprecations

The optional `tokens.deprecations` map marks tokens or component names as deprecated.
Each key is the deprecated name and maps to an object with an optional
`replacement` string:

```ts
tokens: {
  deprecations: {
    old: { replacement: 'new' },
    OldButton: { replacement: 'Button' },
  },
}
```

When the [`design-system/deprecation`](rules/design-system/deprecation.md) rule is enabled, references to these names
will trigger warnings. Running the linter with `--fix` will automatically replace
deprecated names when a `replacement` is provided.

## Rule Options

Rules can also accept configuration objects. For example, the [`design-token/spacing`](rules/design-token/spacing.md)
rule supports a `units` array to control which CSS units are validated (default
is `['px', 'rem', 'em']`):

```js
module.exports = {
  tokens: { spacing: { sm: 4, md: 8 } },
  rules: {
    'design-token/spacing': ['error', { base: 4, units: ['rem', 'vw'] }],
  },
};
```

### Ignore precedence

Ignore patterns are merged in the following order:

1. `.gitignore`
2. `.designlintignore`
3. `ignoreFiles` from the configuration

Later entries override earlier ones, so patterns in `ignoreFiles` take precedence
over `.designlintignore`, which in turn can override `.gitignore`.

## Plugins

Plugins extend `@lapidist/design-lint` with additional rules. Each plugin must export an
object of the form `{ rules: RuleModule[] }`. For example:

```js
// my-plugin/index.js
module.exports = {
  rules: [
    {
      name: 'my-plugin/example',
      meta: { description: 'example rule' },
      create(context) {
        return {
          onNode(node) {
            /* ... */
          },
        };
      },
    },
  ],
};
```

Enable the plugin in your config and reference its rules by name:

```js
module.exports = {
  plugins: ['my-plugin'],
  rules: {
    'my-plugin/example': 'error',
  },
};
```

If a plugin cannot be resolved or does not export the expected shape, the
linter throws an error such as `Failed to load plugin "my-plugin"` or
`Invalid plugin "my-plugin": expected { rules: RuleModule[] }`.

## CSS Parsing

Design-lint uses [PostCSS](https://postcss.org/) to parse CSS. The default
parser understands standard CSS syntax and supports multi-line declarations.
Preprocessor-specific features such as Sass or Less syntax are not supported
unless the source is transformed beforehand. The parser currently exposes no
additional configuration options.
