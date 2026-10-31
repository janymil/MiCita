/**
 * Dev-only additive schema sync.
 *
 * The bundled complete_dump.sql predates the current shared/schema.ts, so a
 * fresh local database is missing a handful of columns that the app and the
 * demo-seed script expect. `drizzle-kit push` is interactive (rename prompts),
 * so this script does the safe half: it only ADDs missing columns, never drops
 * or renames anything.
 *
 * Usage:
 *   npx tsx scripts/dev-sync-schema.ts          # dry run, prints the diff
 *   npx tsx scripts/dev-sync-schema.ts --apply  # execute ALTER TABLEs
 */
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import postgres from "postgres";
import * as schema from "../shared/schema.js";

const apply = process.argv.includes("--apply");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required (pass it in the environment)");
}

const sql = postgres(process.env.DATABASE_URL, {
  ssl: /neon\.tech/.test(process.env.DATABASE_URL) ? { rejectUnauthorized: false } : undefined,
  onnotice: () => {},
});

type Missing = { table: string; column: string; type: string };

const existing = await sql<{ table_name: string; column_name: string }[]>`
  select table_name, column_name
  from information_schema.columns
  where table_schema = 'public'
`;
const have = new Set(existing.map((r) => `${r.table_name}.${r.column_name}`));

const missing: Missing[] = [];
for (const value of Object.values(schema)) {
  if (!(value instanceof PgTable)) continue;
  const cfg = getTableConfig(value);
  for (const column of cfg.columns) {
    if (have.has(`${cfg.name}.${column.name}`)) continue;
    missing.push({ table: cfg.name, column: column.name, type: column.getSQLType() });
  }
}

if (missing.length === 0) {
  console.log("Schema is up to date - no missing columns.");
} else {
  console.log(`${missing.length} missing column(s):`);
  for (const m of missing) console.log(`  ${m.table}.${m.column}  (${m.type})`);
}

if (apply && missing.length) {
  for (const m of missing) {
    const stmt = `ALTER TABLE "${m.table}" ADD COLUMN IF NOT EXISTS "${m.column}" ${m.type}`;
    await sql.unsafe(stmt);
    console.log(`applied: ${stmt}`);
  }
  console.log("Done. NOTE: added columns are nullable; defaults/constraints are not applied.");
}

await sql.end();
