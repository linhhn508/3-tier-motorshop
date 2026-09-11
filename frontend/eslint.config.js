import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettierConfig from 'eslint-plugin-prettier/recommended';
import { globalIgnores } from 'eslint/config';

export default [
  globalIgnores(['dist']),
  js.configs.recommended,
  react.configs.flat.recommended,
  reactHooks.configs.flat['recommended-latest'],
  reactRefresh.configs.vite,
  prettierConfig,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: globals.browser,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'prettier/prettier': [
        'error',
        {
          singleQuote: true,
          printWidth: 140,
          tabWidth: 2,
          semi: true,
          trailingComma: 'es5',
          bracketSpacing: true,
          endOfLine: 'lf',
        },
      ],
    },
  },
  {
    files: ['**/*.{test,spec}.{js,jsx}', 'tests/**/*.{js,jsx}'],
    languageOptions: {
      globals: {
        vi: 'readonly',
        beforeAll: 'readonly',
        beforeEach: 'readonly',
        afterAll: 'readonly',
        afterEach: 'readonly',
        describe: 'readonly',
        expect: 'readonly',
        it: 'readonly',
        test: 'readonly',
      },
    },
  },
];
