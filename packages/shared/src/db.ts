import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema.js";

export const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://snapqueue:snapqueue@localhost:5435/snapqueue";

const client = postgres(DATABASE_URL);

export const db = drizzle(client, { schema });
