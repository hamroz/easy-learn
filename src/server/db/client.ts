import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as { __elSql?: postgres.Sql; __elDb?: Db };

function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const sql = postgres(url, { max: 10, onnotice: () => {} });
  return { sql, db: drizzle(sql, { schema }) };
}

/** Lazily connected singleton (survives Next dev hot reloads). */
export const db: Db = new Proxy({} as Db, {
  get(_t, prop) {
    if (!globalForDb.__elDb) {
      const c = connect();
      globalForDb.__elSql = c.sql;
      globalForDb.__elDb = c.db;
    }
    return Reflect.get(globalForDb.__elDb, prop, globalForDb.__elDb);
  },
});

export async function closeDb() {
  await globalForDb.__elSql?.end({ timeout: 5 });
  globalForDb.__elSql = undefined;
  globalForDb.__elDb = undefined;
}
