/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Custom ESLint rules for the web project.
 *
 * To add a new rule:
 *   1. Create eslint-local-rules/<rule-name>.js
 *   2. Add export here: "rule-name": require("./eslint-local-rules/<rule-name>")
 *   3. Enable in .eslintrc.cjs: "local-rules/rule-name": "error"
 */

module.exports = {
  "import-extensions": require("./eslint-local-rules/import-extensions.cjs"),
};
