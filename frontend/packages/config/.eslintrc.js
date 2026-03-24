module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    'max-lines': ['error', { max: 250, skipBlankLines: true, skipComments: true }],
    'max-lines-per-function': ['error', { max: 30, skipBlankLines: true, skipComments: true }],
    'max-params': ['error', 3],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
  overrides: [
    {
      files: ['*.test.ts'],
      rules: {
        'max-lines-per-function': 'off',
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
  ],
};
