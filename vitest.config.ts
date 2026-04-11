import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: [
        "src/lib/**/*.{ts,tsx}",
        "src/store/**/*.ts",
        "src/i18n/**/*.{ts,tsx}",
        "src/types/**/*.ts",
        "src/components/error-boundary.tsx",
      ],
      exclude: [
        "src/**/__tests__/**",
        "src/**/*.test.{ts,tsx}",
      ],
      reporter: ["text", "text-summary"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
