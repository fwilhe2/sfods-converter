// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Generated build output is not linted.
  { ignores: ["dist/"] },

  eslint.configs.recommended,
  ...tseslint.configs.recommended,
);
