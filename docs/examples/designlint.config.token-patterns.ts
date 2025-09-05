import { defineConfig } from '@lapidist/design-lint';

export default defineConfig({
  tokens: {
    colors: ['--brand-*', /^--theme-/],
  },
  rules: {
    'design-token/colors': 'error',
  },
});

