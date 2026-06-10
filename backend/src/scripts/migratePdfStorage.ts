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
      console.log("Rolling back migration: removing pdf_url and pdf_public_id from decks...");
      await sql`
        ALTER TABLE decks 
        DROP COLUMN IF EXISTS pdf_url,
        DROP COLUMN IF EXISTS pdf_public_id;
      `;
      console.log("Rollback successful.");
    } else {
      console.log("Running migration: adding pdf_url and pdf_public_id to decks...");
      await sql`
        ALTER TABLE decks 
        ADD COLUMN IF NOT EXISTS pdf_url VARCHAR(255),
        ADD COLUMN IF NOT EXISTS pdf_public_id VARCHAR(255);
      `;
      // Verify cascade constraint - it is already set in initDb.ts
      console.log("Migration successful.");
    }
  } catch (error) {
    console.error("Error during migration:", error);
    process.exit(1);
  }
}

run();
