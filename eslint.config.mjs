import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "**/.next/**",
      "**/dist/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/*.config.js",
      "**/*.config.mjs",
      "**/*.config.ts",
      "apps/web/next-env.d.ts"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    plugins: {
      "@next/next": nextPlugin
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "@next/next/no-html-link-for-pages": "off",
      "@next/next/no-img-element": "off"
    }
  },
  {
    files: ["apps/api/**/*.ts", "packages/**/*.ts"],
    languageOptions: {
      globals: globals.node
    }
  }
];
