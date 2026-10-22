// Lecture limitée aux comptes synthétiques du banc USB ; aucun jeton imprimé.
import pg from "../../supabase/tests/e2e/node_modules/pg/lib/index.js";

if (process.env.TEKO_E2E_DISPOSABLE !== "teko-alpha-audit") throw new Error("Banc alpha requis");
const db = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL });
await db.connect();
try {
  const rows = await db.query(`select p.role,p.full_name,
   count(d.id)::int as registered_devices,
   count(d.id) filter(where d.push_token like 'ExpoPushToken[%' or d.push_token like 'ExponentPushToken[%')::int as expo_devices
   from public.profiles p join auth.users u on u.id=p.id
   left join public.devices d on d.user_id=p.id
   where u.phone in ('24107000001','24107000002') group by p.id`);
  console.info(JSON.stringify(rows.rows));
} finally {
  await db.end();
}
