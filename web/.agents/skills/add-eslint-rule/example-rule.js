/**
 * ESLint rule: <rule-name>
 *
 * WHY THIS EXISTS:
 * [Describe the pattern Claude should follow and why it matters]
 *
 * WHAT TRIGGERS IT:
 * [Describe the code pattern that violates this rule]
 *
 * HOW TO FIX:
 * [Describe what Claude should do instead]
 *
 * DOCUMENTATION:
 * See docs/<rule-name>/index.md for detailed guidance
 */

module.exports = {
  meta: {
    type: "problem", // "problem" | "suggestion" | "layout"
    docs: {
      description: "Brief description for --help output",
      category: "Best Practices",
      recommended: true,
    },
    messages: {
      // Define actionable error messages
      // Tell Claude WHAT to do, not just what's wrong
      violation:
        "Don't {{problem}}. Instead, {{solution}}. See docs/<rule-name>/",
    },
    schema: [], // JSON Schema for rule options (usually empty)
  },

  create(context) {
    const filename = context.getFilename();

    // Common: skip test files, mocks, etc.
    const skipPatterns = [".test.ts", ".test.tsx", ".mock.ts", ".mock.tsx"];
    if (skipPatterns.some((pattern) => filename.endsWith(pattern))) {
      return {};
    }

    // Common: only apply to certain directories
    // if (!filename.includes("/app/")) {
    //   return {};
    // }

    return {
      // AST visitor methods - called when ESLint encounters matching nodes
      // See: https://eslint.org/docs/latest/extend/custom-rules#the-context-object

      // Example: catch class instantiation like `new FooRepo()`
      NewExpression(node) {
        if (node.callee.type === "Identifier") {
          const className = node.callee.name;
          if (className.endsWith("Repo")) {
            context.report({
              node,
              messageId: "violation",
              data: {
                problem: `instantiate ${className} directly`,
                solution: "get it from the service layer",
              },
            });
          }
        }
      },

      // Example: catch function calls like `someFunction()`
      // CallExpression(node) {
      //   if (node.callee.type === "Identifier" && node.callee.name === "badFunction") {
      //     context.report({ node, messageId: "violation", data: { ... } });
      //   }
      // },

      // Example: catch imports like `import x from 'bad-package'`
      // ImportDeclaration(node) {
      //   if (node.source.value === "bad-package") {
      //     context.report({ node, messageId: "violation", data: { ... } });
      //   }
      // },

      // Example: check function return types
      // FunctionDeclaration(node) {
      //   if (node.returnType) {
      //     // Check the return type annotation
      //   }
      // },
    };
  },
};
