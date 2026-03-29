import rootConfig from '../../eslint.config.js';

export default [
  ...rootConfig,
  {
    files: ['src/**/*.tsx', 'src/**/*.ts'],
    rules: {
      // TUI-specific rules
      'no-console': 'off', // Console is OK in TUI for debugging
      'react/no-unescaped-entities': 'off', // Allow quotes in text
    },
  },
];
