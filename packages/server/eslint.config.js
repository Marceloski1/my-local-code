import rootConfig from '../../eslint.config.js';

export default [
  ...rootConfig,
  {
    ignores: ['src/__tests__/**/*'],
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      // Server-specific rules
      'no-console': 'off', // Console is OK in server
      // Temporarily disable strict type checking rules for pre-existing code
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/require-await': 'warn',
      '@typescript-eslint/await-thenable': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn',
      '@typescript-eslint/restrict-plus-operands': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
      'no-useless-assignment': 'warn',
      'no-useless-catch': 'warn',
      'prefer-const': 'warn',
      'preserve-caught-error': 'warn',
    },
  },
];
