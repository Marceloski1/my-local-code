import rootConfig from '../../eslint.config.js';

export default [
  ...rootConfig,
  {
    files: ['src/**/*.ts'],
    rules: {
      // Server-specific rules
      'no-console': 'off', // Console is OK in server
    },
  },
];
