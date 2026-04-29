module.exports = {
  env: {
    browser: true,
    es2022: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 'latest',
  },
  rules: {
    'no-eval': 'error',
    'no-restricted-syntax': [
      'error',
      {
        selector: 'AssignmentExpression[left.property.name="innerHTML"]',
        message: 'Writing to innerHTML is forbidden. Use DOMParser or createElement.',
      },
      {
        selector: 'AssignmentExpression[left.property.name="outerHTML"]',
        message: 'Writing to outerHTML is forbidden.',
      }
    ]
  }
};
