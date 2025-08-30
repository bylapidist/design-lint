import { defineConfig } from '@lapidist/design-lint';

export default defineConfig({
  tokens: {
    colors: {
      primary: '#ff0000',
      secondary: '#00ff00'
    },
    spacing: {
      sm: 'var(--spacing-sm)',
      md: 'var(--spacing-md)'
    }
  },
  rules: {
    'design-token/colors': 'error',
    'design-token/spacing': 'warn'
  }
});
