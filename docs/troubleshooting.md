# Troubleshooting

Common runtime errors and how to resolve them when using `@lapidist/design-lint`.

## Invalid configuration

The linter exits early if the configuration file cannot be parsed or is missing
required fields.

- Ensure `designlint.config.json` is valid JSON or that a `.js` file exports an
  object.
- Confirm the path passed with `--config` exists.
- Run `npx design-lint init` to generate a starter config (`--init-format <format>`
  can override the detected format with `js`, `cjs`, `mjs`, `ts`, `mts`, or
  `json`).

## Plugin load failures

Plugins listed in the `plugins` field must be resolvable and export an object
with a `rules` key. If a plugin cannot be loaded or exports the wrong shape, the
CLI throws an error during initialization.

- Verify the plugin package is installed and spelled correctly.
- If using a local path, ensure it is relative to the current working
  directory.
- Check that the plugin exports `{ rules: { ... } }`.

## Missing tokens

Rules that validate design tokens error when a referenced token is not defined.

- Confirm all tokens used in your code are declared in the configuration.
- If using deprecation replacements, ensure both the deprecated and replacement
  tokens exist.

## Node version mismatch

`@lapidist/design-lint` requires Node.js 22 or later. Running the CLI on an
unsupported Node version results in a runtime error.

- Run `node --version` to verify your environment.
- Upgrade Node.js if it is below the required version.
