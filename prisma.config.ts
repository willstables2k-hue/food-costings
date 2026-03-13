import "dotenv/config";
import { defineConfig } from "prisma/config";

// Use Turso for migrations when TURSO_DATABASE_URL is set, otherwise local SQLite
const datasourceUrl = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: datasourceUrl,
    ...(process.env.TURSO_AUTH_TOKEN
      ? { authToken: process.env.TURSO_AUTH_TOKEN }
      : {}),
  },
});
