const designTokensPlugin = require('./eslint-plugins/design-tokens');

module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'eslint-plugins/'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh', 'design-tokens'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
    
    // Design tokens enforcement
    'design-tokens/no-raw-colors': 'error',
    'design-tokens/no-raw-spacing': 'error',
    'design-tokens/no-raw-font-sizes': 'error',
    'design-tokens/no-raw-border-radius': 'error',
  },
}









