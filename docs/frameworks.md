# Framework integrations

Design Lint works with many frontend stacks.

## React / Vite
Lint component files and styles:

```bash
npx design-lint src
```

## Next.js
Run in `next lint` or a separate script:

```bash
npx design-lint pages components
```

## Svelte
Svelte components are parsed so `style:` directives and `<style>` blocks are checked automatically.

```bash
npx design-lint src/routes
```

## Vue
`.vue` single‑file components are supported including SCSS, Sass and Less `<style>` blocks.

```bash
npx design-lint src/components
```

Other frameworks using standard file extensions work without extra configuration.
