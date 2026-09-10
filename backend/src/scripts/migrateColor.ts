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
      console.log("Rolling back migration: removing color from decks...");
      await sql`
        ALTER TABLE decks
        DROP COLUMN IF EXISTS color;
      `;
      console.log("Rollback successful.");
      return;
    }

    console.log("Running migration: adding color to decks...");
    await sql`
      ALTER TABLE decks
      ADD COLUMN IF NOT EXISTS color VARCHAR(20);
    `;

    // Backfill: keep NULL so legacy decks keep the name-hash fallback.
    // No UPDATE needed — NULL = usa hash viejo.
    console.log("Migration successful (existing rows keep color = NULL).");
  } catch (error) {
    console.error("Error during migration:", error);
    process.exit(1);
  }
}

run();
