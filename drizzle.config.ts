import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL environment variable is not set. Copy .env.local.example to .env.local and fill it in."
  );
}

export default defineConfig({
  out: "./drizzle",
  schema: "./lib/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
