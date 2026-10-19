/**
 * Removes test accounts created during development smoke tests.
 * Only touches users matching the known test patterns; never real users.
 */
import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config();
const sql = postgres(process.env.DATABASE_URL, { max: 1 });

const patterns = ["smoke%@example.test", "otp%@example.test", "otpfull%@example.test", "csrf%@example.test", "reset%@example.test"];
let removed = 0;

for (const pattern of patterns) {
  const rows = await sql`
    delete from users
    where email like ${pattern}
    returning id, email
  `;
  for (const r of rows) {
    console.log(`removed user ${r.id} ${r.email}`);
    removed += 1;
  }
}

// Clean up test OTP rows and audit noise for those identifiers.
await sql`delete from verification_otps where identifier like '%@example.test'`;
await sql`delete from auth_audit_log where email like '%@example.test'`;

console.log(`\nRemoved ${removed} test users; purged test OTP/audit rows.`);

const remaining = await sql`select id, email, role from users order by id`;
console.log("Remaining users:");
for (const u of remaining) console.log(`  ${u.id}  ${u.email}  role=${u.role}`);

await sql.end();
