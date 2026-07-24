// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Generated build output is not linted.
  { ignores: ["dist/"] },

  eslint.configs.recommended,

  // Type-aware linting for the TypeScript sources.
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // node:test's test() returns a promise the runner already tracks, so
      // top-level test(...) calls are intentionally not awaited.
      "@typescript-eslint/no-floating-promises": [
        "error",
        {
          allowForKnownSafeCalls: [
            { from: "package", package: "node:test", name: "test" },
          ],
        },
      ],
    },
  },

  // This config file is plain JS and lives outside the TS project, so the
  // type-aware rules can't (and shouldn't) run on it.
  {
    files: ["eslint.config.mjs"],
    ...tseslint.configs.disableTypeChecked,
  },
);
