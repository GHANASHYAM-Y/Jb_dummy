import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: [
        "src/features/**/engine/**",
        "src/features/**/server/**",
        "src/features/**/server.ts",
        "src/features/dare-game/lib/**",
        "src/core/supabase/**",
        "src/shared/lib/**",
        "src/app/api/**",
        "src/app/auth/**",
      ],
      exclude: ["src/**/*.test.*"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
