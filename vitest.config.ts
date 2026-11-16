import path from "node:path"

import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    // Same alias as tsconfig.json: "@/src/..." resolves from the repo root.
    alias: { "@": path.resolve(__dirname) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
})
