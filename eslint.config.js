import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
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
    files: ['app/**/*.jsx'],
    plugins: {
      'jsx-a11y': jsxA11y,
      react,
      'react-hooks': reactHooks,
    },
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      'react/jsx-uses-vars': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/rules-of-hooks': 'error',
    },
  },
  {
    files: ['app/core/**/*.{js,mjs,jsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../../features/**', '../../ui/**', '../../../client/**'],
              message: 'core cannot depend on features, shared UI, or clients',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['app/ui/**/*.{js,mjs,jsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../features/**'],
              message: 'shared UI cannot depend on application features',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['client/**/*.{js,mjs,jsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../app/**'],
              message: 'client adapters cannot depend on the application',
            },
          ],
        },
      ],
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
