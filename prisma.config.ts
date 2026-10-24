import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * `prisma generate` loads this file during `postinstall` and does not connect.
 * `env("DATABASE_URL")` throws when the variable is absent, which fails a fresh
 * install before the PostgreSQL client can be regenerated. Migrate still
 * requires a real `postgresql://` URL and must not invent one.
 */
const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  ...(databaseUrl
    ? {
        datasource: {
          url: databaseUrl,
        },
      }
    : {}),
});
