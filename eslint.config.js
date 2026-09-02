import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', '.codex-worktrees/**']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  {
    files: ['gas/**/*.{js,gs}'],
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
    languageOptions: {
      parserOptions: {
        sourceType: 'script',
      },
      globals: {
        CacheService: 'readonly',
        ContentService: 'readonly',
        DriveApp: 'readonly',
        Logger: 'readonly',
        LockService: 'readonly',
        PropertiesService: 'readonly',
        ScriptApp: 'readonly',
        Session: 'readonly',
        SpreadsheetApp: 'readonly',
        UrlFetchApp: 'readonly',
        Utilities: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        caughtErrors: 'none',
        vars: 'local',
        varsIgnorePattern: '^(?:[A-Z_]|authTest$|doPost$|initialize|run|setup)',
      }],
    },
  },
])
