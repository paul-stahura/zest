/* eslint-env node */
module.exports = {
  root: true,
  ignorePatterns: [
    "dist/**",
    "node_modules/**",
    "scripts/**",
    "eslint-local-rules/**",
    "eslint-local-rules.js",
    "*.config.ts",
    "*.config.js",
    "*.cjs",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
  plugins: [
    "@typescript-eslint",
    "no-only-tests",
    "no-relative-import-paths",
    "local-rules",
  ],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  overrides: [
    {
      files: ["*.ts", "*.tsx"],
      parserOptions: {
        project: ["./tsconfig.json"],
      },
      rules: {
        "@typescript-eslint/no-floating-promises": "error",
      },
    },
    // Math coefficient files: literals copied from published references
    // intentionally carry digits beyond JS double precision for documentation.
    {
      files: ["src/shared/math/zakCalculator.ts", "src/shared/math/zetaEms.ts"],
      rules: {
        "no-loss-of-precision": "off",
      },
    },
  ],
  rules: {
    // type safety
    "@typescript-eslint/no-empty-object-type": "error",
    "@typescript-eslint/no-unsafe-function-type": "error",
    "@typescript-eslint/no-wrapper-object-types": "error",
    "@typescript-eslint/consistent-type-assertions": [
      "error",
      { assertionStyle: "never" },
    ],
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-restricted-types": [
      "error",
      {
        types: {
          String: { message: "Use string instead", fixWith: "string" },
          Boolean: { message: "Use boolean instead", fixWith: "boolean" },
          Number: { message: "Use number instead", fixWith: "number" },
          Symbol: { message: "Use symbol instead", fixWith: "symbol" },
          Function: {
            message:
              "The `Function` type accepts any function-like value and provides no type safety. Define an explicit function shape.",
          },
          Object: {
            message:
              'Use `object` for "any object", or `unknown` for "any value".',
          },
          "{}": {
            message:
              'Use `object` for "any object", `unknown` for "any value", or `Record<string, never>` for "empty object".',
          },
        },
      },
    ],
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        vars: "local",
        varsIgnorePattern: "^_",
        args: "none",
        ignoreRestSiblings: true,
      },
    ],

    // tests
    "no-only-tests/no-only-tests": "error",

    // bad number coercions
    "no-restricted-syntax": [
      "error",
      {
        selector: "CallExpression[callee.name='Number']",
        message:
          "Number() does not handle 'undefined' properly. Parse explicitly.",
      },
      {
        selector: "UnaryExpression[operator='+']",
        message:
          "+ for number conversion does not handle 'undefined' properly. Parse explicitly.",
      },
    ],

    // misc safety
    "valid-typeof": ["error", { requireStringLiterals: true }],
    "curly": ["error", "multi-line"],
    "no-console": "error",
    "no-warning-comments": ["warn", { terms: ["fixme"] }],

    // imports
    "no-relative-import-paths/no-relative-import-paths": [
      "error",
      { allowSameFolder: true, prefix: "@" },
    ],
    "local-rules/import-extensions": "error",

    // formatting-ish
    "spaced-comment": "warn",
    "padding-line-between-statements": [
      "error",
      { blankLine: "always", prev: "*", next: "function" },
      { blankLine: "always", prev: "function", next: "*" },
    ],
  },
};
