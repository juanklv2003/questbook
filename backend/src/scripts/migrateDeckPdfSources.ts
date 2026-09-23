import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in the environment or .env file');
}

const sql = neon(connectionString);

async function run() {
  const isRollback = process.argv.includes('--down');

  try {
    if (isRollback) {
      console.log('Rolling back migration: removing pdf_source_names from decks...');
      await sql`
        ALTER TABLE decks
        DROP COLUMN IF EXISTS pdf_source_names;
      `;
      console.log('Rollback successful.');
      return;
    }

    console.log('Running migration: adding pdf_source_names to decks...');
    await sql`
      ALTER TABLE decks
      ADD COLUMN IF NOT EXISTS pdf_source_names JSONB;
    `;
    console.log('Migration successful (existing rows keep pdf_source_names = NULL).');
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

run();
