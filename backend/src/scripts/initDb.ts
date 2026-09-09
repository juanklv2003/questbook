import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined in the environment or .env file");
}

const sql = neon(connectionString);

async function initDb() {
  try {
    console.log("Connecting to the database via Neon Serverless Driver...");

    // Folders table
    await sql`
      CREATE TABLE IF NOT EXISTS folders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("Created table: folders");

    // Decks table
    await sql`
      CREATE TABLE IF NOT EXISTS decks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
        shelf_index INT NOT NULL DEFAULT 0,
        position INT NOT NULL DEFAULT 0,
        studied_count INT NOT NULL DEFAULT 0,
        correct_count INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("Created table: decks");

    // Shelf columns for databases created before this change
    await sql`
      ALTER TABLE decks ADD COLUMN IF NOT EXISTS shelf_index INT NOT NULL DEFAULT 0;
    `;
    await sql`
      ALTER TABLE decks ADD COLUMN IF NOT EXISTS position INT NOT NULL DEFAULT 0;
    `;
    console.log("Ensured columns: decks.shelf_index, decks.position");

    // Study-progress counters for databases created before this change.
    // progress_percent is derived (round(100*correct/studied), null when 0).
    await sql`
      ALTER TABLE decks ADD COLUMN IF NOT EXISTS studied_count INT NOT NULL DEFAULT 0;
    `;
    await sql`
      ALTER TABLE decks ADD COLUMN IF NOT EXISTS correct_count INT NOT NULL DEFAULT 0;
    `;
    console.log("Ensured columns: decks.studied_count, decks.correct_count");

    // Flashcards table
    await sql`
      CREATE TABLE IF NOT EXISTS flashcards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("Created table: flashcards");

    console.log("Database schema initialized successfully.");
  } catch (error) {
    console.error("Error initializing database schema:", error);
    process.exit(1);
  }
}

initDb();
