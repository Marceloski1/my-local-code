import rootConfig from '../../eslint.config.js';

export default [
  ...rootConfig,
  {
    files: ['src/**/*.ts'],
    rules: {
      // SDK-specific rules
      'no-console': 'warn',
    },
  },
];
