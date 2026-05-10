import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import simpleImportSort from "eslint-plugin-simple-import-sort";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      "simple-import-sort/imports": [
        "error",
        {
          groups: [
            // Side-effect imports first.
            ["^\\u0000"],
            // React + Next core.
            ["^react$", "^react/", "^next$", "^next/"],
            // Other npm packages.
            ["^@?\\w"],
            // Internal aliases (project-specific).
            ["^@/"],
            // Parent / sibling / index imports.
            ["^\\.\\.(?!/?$)", "^\\.\\./?$"],
            ["^\\./(?=.*/)(?!/?$)", "^\\.(?!/?$)", "^\\./?$"],
            // Style imports.
            ["^.+\\.s?css$"],
          ],
        },
      ],
      "simple-import-sort/exports": "error",
      // Catch unused imports as errors instead of warnings.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // Disallow console outside warn/error to keep prod clean.
      "no-console": ["warn", { allow: ["warn", "error"] }],
      // Prefer const where possible.
      "prefer-const": "error",
      // No var.
      "no-var": "error",
      eqeqeq: ["error", "smart"],
    },
  },
]);

export default eslintConfig;
