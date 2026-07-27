import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist",
      ".output",
      ".vinxi",
      ".vercel",
      "src/routeTree.gen.ts",
      "src/components/dictionary/italianVerbProfiles.ts",
      "src/components/dictionary/italianWordData.ts",
      "src/components/dictionary/verbProfiles.ts",
      "src/components/dictionary/wordData.ts",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    // Existing lint debt is confined to these legacy files. Keep the rules
    // visible as warnings without weakening them for new code elsewhere.
    files: [
      "src/components/climbing/CommandCards.tsx",
      "src/components/games/CrossGameAchievements.tsx",
      "src/components/grammar/QuizCard.tsx",
      "src/components/match/MatchmakingOverlay.tsx",
      "src/components/match/RankBadge.tsx",
      "src/components/match/RankUpCeremony.tsx",
      "src/components/missionary/useMissionarySpeech.ts",
      "src/components/penpal/VocabBuilder.tsx",
      "src/components/reader/AnnotatedSentence.tsx",
      "src/components/reader/ClickableText.tsx",
      "src/components/reader/FuriganaText.tsx",
      "src/components/speak/SpeakLearn.tsx",
      "src/lib/extract-book.ts",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
      "no-control-regex": "warn",
      "no-useless-escape": "warn",
      "prefer-const": "warn",
    },
  },
  eslintConfigPrettier,
);
