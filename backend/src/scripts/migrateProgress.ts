import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined in the environment or .env file");
}

const sql = neon(connectionString);

async function run() {
  const isRollback = process.argv.includes('--down');

  try {
    if (isRollback) {
      console.log("Rolling back migration: removing studied_count and correct_count from decks...");
      await sql`
        ALTER TABLE decks
        DROP COLUMN IF EXISTS studied_count,
        DROP COLUMN IF EXISTS correct_count;
      `;
      console.log("Rollback successful.");
      return;
    }

    console.log("Running migration: adding studied_count and correct_count to decks...");
    await sql`
      ALTER TABLE decks
      ADD COLUMN IF NOT EXISTS studied_count INT NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS correct_count INT NOT NULL DEFAULT 0;
    `;

    // progress_percent is derived (round(100*correct/studied), null when
    // studied = 0), so no backfill is needed: existing decks start at 0/0.
    const rows = await sql`
      SELECT COUNT(*)::int AS "count" FROM decks;
    ` as { count: number }[];

    console.log(`Study-progress counters ensured for ${rows[0]?.count ?? 0} deck(s).`);
    console.log("Migration successful.");
  } catch (error) {
    console.error("Error during migration:", error);
    process.exit(1);
  }
}

run();
