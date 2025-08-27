module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: { node: true, es2021: true, jest: true },
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
  },
};
