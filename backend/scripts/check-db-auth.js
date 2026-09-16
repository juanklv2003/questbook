require('dotenv/config');
const { neon } = require('@neondatabase/serverless');

async function main() {
  const sql = neon(process.env.DATABASE_URL);
  const cols = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
    ORDER BY 1
  `;
  console.log('users columns:', cols.map((c) => c.column_name).join(', '));
  const oauthTable = await sql`
    SELECT to_regclass('public.oauth_exchange_codes') AS reg
  `;
  console.log('oauth_exchange_codes:', oauthTable[0]?.reg ?? 'missing');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
