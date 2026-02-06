import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./migrations",
  schema: [
    "./shared/schema.ts",
    "./shared/template-schema.ts",
    "./shared/workflow-schema.ts",
  ],
  dialect: "sqlite",
  dbCredentials: {
    url: "file:./dev.db",
  },
});
