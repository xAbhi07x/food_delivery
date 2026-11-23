import path from "node:path";
import { defineConfig } from "vitest/config";

const alias = { "@": path.resolve(import.meta.dirname, "src") };
const setupFiles = ["tests/setup/load-env.ts"];

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts", "tests/unit/**/*.test.ts"],
        },
      },
      {
        resolve: { alias },
        test: {
          name: "db",
          environment: "node",
          include: ["tests/db/**/*.test.ts"],
          setupFiles,
          testTimeout: 20_000,
        },
      },
      {
        // Talks to the running local Supabase stack (Auth API + database).
        resolve: { alias },
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          setupFiles,
          testTimeout: 30_000,
          // Tests share the Auth service and its per-number rate limits; run files one at a time.
          fileParallelism: false,
        },
      },
    ],
  },
});
