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
      console.log("Rolling back migration: removing study_sessions...");
      await sql`
        DROP TABLE IF EXISTS study_sessions;
      `;
      console.log("Rollback successful.");
      return;
    }

    console.log("Running migration: creating study_sessions...");
    await sql`
      CREATE TABLE IF NOT EXISTS study_sessions (
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
        current_index INT NOT NULL DEFAULT 0,
        results JSONB NOT NULL DEFAULT '{}'::jsonb,
        flashcards_hash TEXT,
        finished BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, deck_id)
      );
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_study_sessions_deck ON study_sessions (deck_id);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_study_sessions_user ON study_sessions (user_id);
    `;
    // Idempotency for DBs where the table already exists without the newest columns.
    await sql`
      ALTER TABLE study_sessions ADD COLUMN IF NOT EXISTS current_index INT NOT NULL DEFAULT 0;
    `;
    await sql`
      ALTER TABLE study_sessions ADD COLUMN IF NOT EXISTS results JSONB NOT NULL DEFAULT '{}'::jsonb;
    `;
    await sql`
      ALTER TABLE study_sessions ADD COLUMN IF NOT EXISTS flashcards_hash TEXT;
    `;
    await sql`
      ALTER TABLE study_sessions ADD COLUMN IF NOT EXISTS finished BOOLEAN NOT NULL DEFAULT FALSE;
    `;
    console.log("Migration successful (study_sessions persists until explicit DELETE).");
  } catch (error) {
    console.error("Error during migration:", error);
    process.exit(1);
  }
}

run();
