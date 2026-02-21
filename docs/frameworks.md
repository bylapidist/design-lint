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
- [Currently supported file types](#currently-supported-file-types)
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

## Currently supported file types
design-lint currently supports these file extensions:

- `ts`
- `tsx`
- `mts`
- `cts`
- `js`
- `jsx`
- `mjs`
- `cjs`
- `css`
- `scss`
- `sass`
- `less`
- `vue`
- `svelte`

## Other environments
Angular, Astro, and static HTML files are not linted directly.

If you use Angular or Astro, lint the supported TypeScript/JavaScript and stylesheet files in those projects.

Examples:

- Angular app code and styles:

  ```bash
  npx design-lint "src/**/*.{ts,js,css,scss,sass,less}"
  ```

- Astro scripts and styles:

  ```bash
  npx design-lint "src/**/*.{ts,tsx,js,jsx,css,scss,sass,less}"
  ```

For static HTML projects, target the referenced CSS files or any supported script/style sources instead of `.html` files.

## See also
- [Rules](./rules/index.md)
- [Plugins](./plugins.md)
- [Configuration](./configuration.md)
