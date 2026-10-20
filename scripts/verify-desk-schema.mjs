import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const sql = postgres(connectionString, {
  max: 1,
  ssl: /neon\.tech/.test(connectionString) ? { rejectUnauthorized: false } : undefined,
});

const columns = await sql`
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'appointments'
    AND column_name IN ('source', 'started_at', 'completed_at')
  ORDER BY column_name
`;
const table = await sql`SELECT to_regclass('public.service_transactions') AS t`;
const queueTable = await sql`SELECT to_regclass('public.queue_tickets') AS q`;
const deskSettingsColumn = await sql`
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'business_settings' AND column_name = 'desk_settings'
`;
const promoTable = await sql`SELECT to_regclass('public.promos') AS p, to_regclass('public.promo_claims') AS pc, to_regclass('public.whatsapp_messages') AS wm`;
const txColumns = await sql`
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'service_transactions'
  ORDER BY ordinal_position
`;
const queueColumns = await sql`
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'queue_tickets'
  ORDER BY ordinal_position
`;
const counts = await sql`
  SELECT
    (SELECT COUNT(*) FROM service_transactions)::int AS transactions,
    (SELECT COUNT(*) FROM appointments WHERE source = 'walk_in')::int AS walk_ins,
    (SELECT COUNT(*) FROM queue_tickets)::int AS queue_tickets,
    (SELECT COUNT(*) FROM promos)::int AS promos,
    (SELECT COUNT(*) FROM promo_claims)::int AS promo_claims,
    (SELECT COUNT(*) FROM whatsapp_messages)::int AS whatsapp_messages
`;

console.log("appointments:", columns.map((row) => row.column_name).join(", "));
console.log("service_transactions:", table[0]?.t ?? "MISSING");
console.log("service_transactions columns:", txColumns.map((row) => row.column_name).join(", "));
console.log("queue_tickets:", queueTable[0]?.q ?? "MISSING");
console.log("queue_tickets columns:", queueColumns.map((row) => row.column_name).join(", "));
console.log("business_settings.desk_settings:", deskSettingsColumn[0]?.column_name ?? "MISSING");
console.log(
  "promo tables:",
  promoTable[0]?.p ?? "MISSING",
  promoTable[0]?.pc ?? "MISSING",
  promoTable[0]?.wm ?? "MISSING",
);
console.log(
  "rows:",
  `transactions=${counts[0].transactions}`,
  `walk_ins=${counts[0].walk_ins}`,
  `queue_tickets=${counts[0].queue_tickets}`,
  `promos=${counts[0].promos}`,
  `promo_claims=${counts[0].promo_claims}`,
  `whatsapp_messages=${counts[0].whatsapp_messages}`,
);

await sql.end();
