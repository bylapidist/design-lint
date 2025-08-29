# Configuration

Create a `designlint.config.js` (or `.ts`, `.mjs`, `.mts`, `.json`) file in your project root:

```js
module.exports = {
  tokens: {
    colors: { primary: '#ff0000' },
    spacing: { sm: 4, md: 8 },
    typography: {
      fontSizes: { base: 16 },
      fonts: { sans: 'Inter, sans-serif' },
    },
  },
  rules: {
    'design-token/colors': 'error',
  },
};
```

See [design-token/colors](rules/design-token/colors.md), [design-token/spacing](rules/design-token/spacing.md), and [design-token/typography](rules/design-token/typography.md) for rule details.

@lapidist/design-lint searches for configuration starting from the current working
directory and walking up parent directories. In each directory it looks for
`designlint.config.js`, `designlint.config.cjs`, `designlint.config.mjs`,
`designlint.config.ts`, `designlint.config.mts`, then
`designlint.config.json`. The first file found is used. Loading TypeScript
config files requires [`ts-node`](https://typestrong.org/ts-node/) to be
installed.

If the discovered configuration file contains invalid JSON or JavaScript,
@lapidist/design-lint will throw an error including the file path and the underlying
syntax message.

## Fields

- `tokens`: Design token definitions such as colors, spacing and typography.
- `rules`: Map of rule name to severity or `[severity, options]`.
- `ignoreFiles`: Glob patterns to exclude from linting.
- `plugins`: Additional plugin packages to load.
- `concurrency`: Maximum number of files processed concurrently. Defaults to the number of CPU cores.

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
