/**
 * ESLint rule: import-extensions
 *
 * WHY THIS EXISTS:
 * Vite resolves both static and dynamic imports at build time. File extensions
 * on TS imports break TypeScript module resolution (TS5097 unless
 * allowImportingTsExtensions is set). Forbid extensions on local imports.
 *
 * WHAT TRIGGERS IT:
 * - Any local import (static or dynamic) ending in .ts/.tsx/.js/.jsx/.mjs/.cjs:
 *     import { foo } from '@/lib/bar.ts'
 *     await import('@/lib/bar.ts')
 *
 * HOW TO FIX:
 * - Remove the extension: import { foo } from '@/lib/bar'
 */

const JS_TS_EXTENSIONS = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

function isLocalImport(source) {
  return source.startsWith(".") || source.startsWith("@/");
}

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Forbid file extensions on local imports (Vite/TS bundler handles resolution)",
      category: "Best Practices",
      recommended: true,
    },
    fixable: "code",
    messages: {
      hasExtension:
        "Remove file extension from import '{{source}}'. Use '{{fixed}}' instead.",
    },
    schema: [],
  },

  create(context) {
    function checkStaticSource(node) {
      if (!node.source) return;
      const source = node.source.value;
      if (!isLocalImport(source)) return;
      if (JS_TS_EXTENSIONS.test(source)) {
        reportNode(node.source, source);
      }
    }

    function reportNode(literalNode, source) {
      const fixed = source.replace(JS_TS_EXTENSIONS, "");
      const raw = context.getSourceCode().getText(literalNode);
      const quote = raw[0];
      context.report({
        node: literalNode,
        messageId: "hasExtension",
        data: { source, fixed },
        fix(fixer) {
          return fixer.replaceText(literalNode, `${quote}${fixed}${quote}`);
        },
      });
    }

    return {
      ImportDeclaration: checkStaticSource,
      ExportNamedDeclaration: checkStaticSource,
      ExportAllDeclaration: checkStaticSource,

      ImportExpression(node) {
        const arg = node.source;
        if (!arg || arg.type !== "Literal" || typeof arg.value !== "string") {
          return;
        }
        const source = arg.value;
        if (!isLocalImport(source)) return;
        if (JS_TS_EXTENSIONS.test(source)) {
          reportNode(arg, source);
        }
      },
    };
  },
};
