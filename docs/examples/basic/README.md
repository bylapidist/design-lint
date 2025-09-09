---
title: Basic Example
description: "Minimal project linted with design-lint."
---

# Basic Example

This example introduces design-lint with a single token and rule.

## Steps
1. Install dependencies:
   ```bash
   npm install --save-dev @lapidist/design-lint
   ```
2. Run the linter:
   ```bash
   npx design-lint "src/**/*" --config designlint.config.json
   ```

## Key files
- `designlint.config.json` – defines a `primary` color token and enables the `design-token/colors` rule.

## Expected output
When a file uses `#ff0000`, the linter reports an error suggesting the `primary` token.

## Next steps
Read the [Getting Started guide](../../usage.md) for more details.
