---
title: Configuration Presets
description: "Shareable rule presets: recommended, strict, and ai-agent."
sidebar_position: 4
---

# Configuration Presets

design-lint ships three shareable configuration presets as separate packages. Each preset is a plain object that you spread into your `defineConfig()` call — no plugin system required.

## Table of contents
- [recommended](#recommended)
- [strict](#strict)
- [ai-agent](#ai-agent)
- [Combining presets](#combining-presets)
- [See also](#see-also)

---

## recommended

**Package:** `@lapidist/design-lint-config-recommended`

Enables all stable rules at `warn` severity. Use this as a starting point and promote individual rules to `error` as your team's adoption matures.

### Install

```bash
pnpm add --save-dev @lapidist/design-lint-config-recommended
```

### Usage

```ts
// designlint.config.ts
import { defineConfig } from '@lapidist/design-lint';
import recommended from '@lapidist/design-lint-config-recommended';

export default defineConfig({ ...recommended });
```

### Rules enabled

| Rule | Severity |
| --- | --- |
| `design-token/colors` | `warn` |
| `design-token/spacing` | `warn` |
| `design-token/easing` | `warn` |
| `design-token/css-var-provenance` | `warn` |
| `design-token/composite-equivalence` | `warn` |
| `design-system/deprecation` | `warn` |
| `design-system/jsx-style-values` | `warn` |
| `design-system/no-hardcoded-spacing` | `warn` |

---

## strict

**Package:** `@lapidist/design-lint-config-strict`

Upgrades all recommended rules to `error` severity. Use this in codebases where token enforcement is fully established and violations must block CI.

### Install

```bash
pnpm add --save-dev @lapidist/design-lint-config-strict
```

### Usage

```ts
// designlint.config.ts
import { defineConfig } from '@lapidist/design-lint';
import strict from '@lapidist/design-lint-config-strict';

export default defineConfig({ ...strict });
```

### Rules enabled

| Rule | Severity |
| --- | --- |
| `design-token/colors` | `error` |
| `design-token/spacing` | `error` |
| `design-token/easing` | `error` |
| `design-token/css-var-provenance` | `error` |
| `design-token/composite-equivalence` | `error` |
| `design-system/deprecation` | `error` |
| `design-system/jsx-style-values` | `error` |
| `design-system/no-hardcoded-spacing` | `error` |

---

## ai-agent

**Package:** `@lapidist/design-lint-config-ai-agent`

Enables rules that specifically target failure modes of AI coding agents — raw color values, hard-coded spacing, inline style objects, composite token bypasses, and untracked CSS variable references. Use this alongside `recommended` or `strict` in CI pipelines that review AI-generated code.

### Install

```bash
pnpm add --save-dev @lapidist/design-lint-config-ai-agent
```

### Usage

```ts
// designlint.config.ts
import { defineConfig } from '@lapidist/design-lint';
import recommended from '@lapidist/design-lint-config-recommended';
import aiAgent from '@lapidist/design-lint-config-ai-agent';

export default defineConfig({ ...recommended, ...aiAgent });
```

### Rules enabled

| Rule | Severity |
| --- | --- |
| `design-token/easing` | `error` |
| `design-token/css-var-provenance` | `error` |
| `design-token/composite-equivalence` | `error` |
| `design-system/jsx-style-values` | `error` |
| `design-system/no-hardcoded-spacing` | `error` |

---

## Combining presets

Presets are plain objects. Spread them in priority order (rightmost wins for overlapping keys):

```ts
// Start with recommended, tighten with strict, add AI-agent rules
export default defineConfig({
  ...recommended,
  ...strict,
  ...aiAgent,
  // Project-specific overrides
  rules: {
    ...strict.rules,
    ...aiAgent.rules,
    'design-token/colors': 'warn', // relax one rule
  },
});
```

You can also spread a preset and add your own rules inline:

```ts
export default defineConfig({
  ...recommended,
  rules: {
    ...recommended.rules,
    'design-system/component-usage': ['error', {
      substitutions: { button: 'DSButton' },
    }],
  },
});
```

## See also

- [Configuration](./configuration.md)
- [Rule reference](./rules/index.md)
- [Plugins](./plugins.md)
