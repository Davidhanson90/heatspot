import js from "@eslint/js";
import tsEslintPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import importPlugin from "eslint-plugin-import";
import globals from "globals";

export default [
  {
    ignores: ["dist/**", "harness-dist/**", "node_modules/**", "coverage/**"]
  },
  js.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module"
      },
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    plugins: {
      "@typescript-eslint": tsEslintPlugin,
      import: importPlugin
    },
    rules: {
      ...tsEslintPlugin.configs.recommended.rules,
      "import/extensions": [
        "error",
        "ignorePackages",
        {
          js: "always",
          mjs: "always",
          cjs: "always"
        }
      ]
    }
  }
];
