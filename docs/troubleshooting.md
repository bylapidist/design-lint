# Troubleshooting

## Config file not found

### Symptom
`Error: Config file not found` when running the CLI.

### Cause
No configuration file is present or the provided path is incorrect.

### Resolution
Run `npx design-lint init` to generate a configuration file. Use `--config` to specify a path.

### Related docs
- [Configuration](./configuration.md)

## Unknown rule

### Symptom
`Unknown rule "..."`

### Cause
The rule is misspelled or the plugin providing it is not installed.

### Resolution
Ensure the rule name is correct and the plugin providing it is installed.

### Related docs
- [Rule reference](./rules/index.md)
- [Plugins](./plugins.md)

## Plugin failed to load

### Symptom
`Error: Failed to load plugin "..."`

### Cause
Node.js cannot resolve the plugin module or it does not export a `rules` array.

### Resolution
Verify the package name and that the plugin exports a `rules` array.

### Related docs
- [Plugins](./plugins.md)

## Parser error

### Symptom
`ParserError` or similar message.

### Cause
The file could not be parsed due to an incorrect extension or mismatched `lang` attribute.

### Resolution
Verify the file extension and that any `lang` attributes match the content.

### Related docs
- [Usage](./usage.md)

## Formatter failure

### Symptom
`Error: Formatter threw an exception` or the CLI exits after selecting a custom formatter.

### Cause
The formatter failed to export a default function or raised a runtime error.

### Resolution
Ensure the formatter exports a default function that returns a string and handles all results.

### Related docs
- [Formatters](./formatters.md)

## Outdated Node version

### Symptom
`Error: Node.js 18 is not supported` or unexpected syntax errors.

### Cause
Design Lint requires Node.js 22 or later.

### Resolution
Upgrade to Node.js 22 or later.

### Related docs
- [README](https://github.com/bylapidist/design-lint/blob/main/README.md)

## Performance bottleneck

### Symptom
Linting takes an excessively long time or maxes out CPU usage.

### Cause
Large projects are scanned without caching or rules with high complexity.

### Resolution
Enable caching with `--cache`, limit the files to lint, or review custom rules for performance issues.

### Related docs
- [Usage](./usage.md)
- [Architecture](./architecture.md)

## Keyword index

| Error message | Section |
| ------------- | ------- |
| `Config file not found` | [Config file not found](#config-file-not-found) |
| `Unknown rule` | [Unknown rule](#unknown-rule) |
| `Failed to load plugin` | [Plugin failed to load](#plugin-failed-to-load) |
| `ParserError` | [Parser error](#parser-error) |
| `Formatter threw an exception` | [Formatter failure](#formatter-failure) |
| `Node.js 18 is not supported` | [Outdated Node version](#outdated-node-version) |
| `Linting is slow` | [Performance bottleneck](#performance-bottleneck) |
