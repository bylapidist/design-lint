---
title: Framework Integrations
description: "Use design-lint with popular frontend frameworks."
sidebar_position: 7
---

# Framework Integrations

This guide targets front-end developers integrating design-lint into specific ecosystems.

## Table of contents
- [React](#react)
- [Next.js](#nextjs)
- [Vue](#vue)
- [Svelte](#svelte)
- [Other environments](#other-environments)
- [See also](#see-also)

## React
Lint React components and CSS-in-JS files:

```bash
npx design-lint "src/**/*.{ts,tsx,css}"
```

```json
// designlint.config.json
{
  "rules": { "design-system/component-usage": "error" }
}
```

## Next.js
Run design-lint alongside `next lint` or as a separate script. The example below enforces token usage in pages and components:

```bash
npx design-lint pages components
```

## Vue
`.vue` single‑file components are parsed so template, script, and style blocks are checked automatically.

```bash
npx design-lint "src/**/*.vue"
```

## Svelte
Svelte components include `<script>` and `<style>` sections. design-lint understands both:

```bash
npx design-lint src/routes
```

## Other environments
Angular, Astro, and static HTML files work out of the box as long as file extensions are provided. Adjust glob patterns accordingly.

## See also
- [Rules](./rules/index.md)
- [Plugins](./plugins.md)
- [Configuration](./configuration.md)
