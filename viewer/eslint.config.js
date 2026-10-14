import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["dist", "node_modules"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat["recommended-latest"],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: ["./*", "../*"], message: "Use the `@/` alias (src) instead of relative imports." }] },
      ],
    },
  },
  {
    files: ["src/components/ui/**/*.tsx"],
    rules: { "react-refresh/only-export-components": "off" },
  },
  prettier,
]);
