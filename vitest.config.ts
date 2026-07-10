import { defineConfig } from "vitest/config";

/**
 * Only src/store/** is tested here. Those modules are deliberately pure TS —
 * no react-native, no image `require()`, no AsyncStorage — so the whole domain
 * runs headless in Node. Screens stay covered by `tsc` + the manual checklist.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/store/**/*.test.ts"],
  },
});
