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

## Angular
Component templates (`.html`) and styles (`.scss`/`.css`) live alongside TypeScript files. Inline `template` and `styles` fields on `@Component` are checked automatically.

```bash
npx design-lint "src/**/*.component.{ts,html,scss}"
```

```json
{
  "scripts": {
    "lint:design": "design-lint \"src/**/*.component.{ts,html,scss}\""
  }
}
```

## Astro
`.astro` files mix markup and scripts. `<style>` tags and inline styles are linted without extra setup.

```bash
npx design-lint src/pages src/components
```

```json
{
  "scripts": {
    "lint:design": "design-lint src/pages src/components"
  }
}
```

## HTML
Static HTML files with inline `<style>` blocks or `style` attributes can be linted directly.

```bash
npx design-lint "public/**/*.html"
```

```json
{
  "scripts": {
    "lint:design": "design-lint \"public/**/*.html\""
  }
}
```

Other frameworks using standard file extensions work without extra configuration.

## ESLint and Stylelint
Design Lint focuses on design token usage and component conventions, so keep existing linters for syntax rules. Run them side by side:

```json
{
  "scripts": {
    "lint": "eslint . && stylelint \"**/*.css\" && design-lint src"
  }
}
```

When migrating, disable overlapping token or naming checks in ESLint or Stylelint to avoid duplicate warnings, and share ignore files to skip build outputs.
