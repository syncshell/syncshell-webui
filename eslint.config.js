import js from '@eslint/js';
import globals from 'globals';

const browserFiles = [
  'app/**/*.{js,mjs,jsx}',
  'client/**/*.{js,mjs,jsx}',
  'integration/**/*.js',
];

const nodeFiles = [
  'eslint.config.js',
  'scripts/**/*.{js,mjs}',
  'tests/**/*.{js,mjs}',
  'vite.config.js',
];

export default [
  {
    ignores: [
      'dist/',
      'node_modules/',
      'playwright-report/',
      'release/',
      'static/vendor/',
      'test-results/',
      'TODO/',
    ],
  },
  js.configs.recommended,
  {
    files: browserFiles,
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      sourceType: 'module',
    },
  },
  {
    files: nodeFiles,
    languageOptions: {
      ecmaVersion: 'latest',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      sourceType: 'module',
    },
  },
  {
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];
