---
title: Basic Example
description: "Minimal project linted with design-lint."
---

# Basic Example

This example introduces design-lint with a single token and rule.

## Steps
1. Install dependencies:
   ```bash
   pnpm add --save-dev @lapidist/design-lint
   ```
2. Start the DSR kernel and seed your token catalog:
   ```bash
   design-lint kernel start --config-path designlint.config.json
   ```
3. Run the linter:
   ```bash
   npx design-lint "src/**/*" --config designlint.config.json
   ```

## Key files
- `designlint.config.json` – enables the `design-token/colors` rule.
- `tokens.json` – DTIF token catalog with `primary` and `secondary` color tokens, referenced by the config.

## Expected output
When a file uses a raw color not matching any token value, the linter reports an error.

## Next steps
Read the [Getting Started guide](../../usage.md) for more details.
