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
      console.log('Rolling back: dropping idx_flashcards_deck_id...');
      await sql`DROP INDEX IF EXISTS idx_flashcards_deck_id;`;
      console.log('Rollback successful.');
      return;
    }

    console.log('Running migration: idx_flashcards_deck_id on flashcards(deck_id)...');
    await sql`
      CREATE INDEX IF NOT EXISTS idx_flashcards_deck_id ON flashcards (deck_id);
    `;
    console.log('Migration successful.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

run();
