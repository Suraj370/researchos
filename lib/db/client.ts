import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

import * as schema from "./schema";

let pool: Pool | null = null;

export function getDb() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL environment variable is not set. Copy .env.local.example to .env.local and fill it in."
      );
    }
    pool = new Pool({ connectionString });
  }
  return drizzle(pool, { schema });
}
