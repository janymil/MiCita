import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config();

const conn = process.env.DATABASE_URL;
if (!conn) {
  console.log("NO DATABASE_URL");
  process.exit(1);
}
console.log("host:", new URL(conn).host, "| user:", new URL(conn).username, "| db:", new URL(conn).pathname);

const sql = postgres(conn, { max: 1, connect_timeout: 20 });
try {
  const tables = await sql`select table_name from information_schema.tables where table_schema='public' order by table_name`;
  console.log("TABLES(" + tables.length + "):", tables.map((r) => r.table_name).join(", "));
  for (const tbl of ["users", "businesses", "apify_businesses", "openstreet_businesses", "appointments", "clients", "services", "business_settings", "user_preferences"]) {
    try {
      const r = await sql.unsafe('select count(*)::int as n from "' + tbl + '"');
      console.log("  " + tbl + ":", r[0].n);
    } catch (e) {
      console.log("  " + tbl + ": ERR " + e.message);
    }
  }
} catch (e) {
  console.log("ERR:", e.message);
} finally {
  await sql.end();
}
