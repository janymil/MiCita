import postgres from "postgres";
import dotenv from "dotenv";
dotenv.config();

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const users = await sql`select id, email, name, stack_auth_id, created_at from users order by id`;
console.log("USERS:", JSON.stringify(users, null, 1));
const cols = await sql`select column_name, data_type, is_nullable from information_schema.columns where table_name='users' order by ordinal_position`;
console.log("USER_COLS:", cols.map((c) => c.column_name + ":" + c.data_type + (c.is_nullable === "NO" ? "!" : "")).join(", "));
await sql.end();
