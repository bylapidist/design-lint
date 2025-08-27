# design-lint

`design-lint` is a pluggable linter for enforcing design system rules in codebases. It checks tokens and component usage across JavaScript/TypeScript and CSS files.

## Usage

```sh
npx design-lint .
```

Full documentation is available in the [docs](docs/usage.md) directory.

## Features
- Enforce color, spacing, and typography tokens
- Prevent deprecated or raw HTML component usage
- Pluggable rule and formatter architecture
- JSON and SARIF output for CI

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.
