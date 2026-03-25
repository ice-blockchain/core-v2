/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
  ],
  env: {
    node: true,
    es2022: true,
  },
  rules: {
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/consistent-type-imports": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "max-lines": ["error", { max: 300, skipBlankLines: true, skipComments: true }],
    "max-lines-per-function": ["error", { max: 30, skipBlankLines: true, skipComments: true }],
    "max-params": ["error", 3],
    "no-empty": "error",
  },
  overrides: [
    {
      files: ["*.test.ts"],
      rules: {
        "max-lines-per-function": "off",
      },
    },
  ],
  ignorePatterns: ["node_modules/", "dist/", "*.config.js", "*.config.ts", "**/icons/generated/**"],
};
