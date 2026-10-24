// Built by TAC — 2026-10-23
// ESLint config for the exams v2 .mts scripts, which the repo's main config and lint-changed do
// not match. Run by the "the .mts authoring scripts pass ESLint" test in
// tests/exams2-scripts.test.mjs, so it is part of npm test.
import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["scripts/exams2-*.mts"],
    languageOptions: { ecmaVersion: 2022, globals: globals.node },
    rules: { "@typescript-eslint/no-unused-vars": "off" },
  },
  eslintConfigPrettier,
);
