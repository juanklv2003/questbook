import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined in the environment or .env file");
}

const sql = neon(connectionString);

const SHELF_COUNT = 3;

async function run() {
  const isRollback = process.argv.includes('--down');

  try {
    if (isRollback) {
      console.log("Rolling back migration: removing shelf_index and position from decks...");
      await sql`
        ALTER TABLE decks
        DROP COLUMN IF EXISTS shelf_index,
        DROP COLUMN IF EXISTS position;
      `;
      console.log("Rollback successful.");
      return;
    }

    console.log("Running migration: adding shelf_index and position to decks...");
    await sql`
      ALTER TABLE decks
      ADD COLUMN IF NOT EXISTS shelf_index INT NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS position INT NOT NULL DEFAULT 0;
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_decks_shelf ON decks (user_id, shelf_index, position);
    `;

    // Backfill: preserve the legacy auto-distribution (Math.ceil(n / 3) slices
    // over created_at DESC) so the existing dashboard layout does not change.
    // Newest decks keep their relative order; ties are impossible (position is unique per shelf).
    const rows = await sql`
      SELECT id, user_id AS "userId"
      FROM decks
      ORDER BY user_id, created_at DESC;
    ` as { id: string; userId: string }[];

    const byUser = new Map<string, string[]>();
    for (const row of rows) {
      const list = byUser.get(row.userId) ?? [];
      list.push(row.id);
      byUser.set(row.userId, list);
    }

    for (const [, ids] of byUser) {
      const booksPerShelf = Math.max(1, Math.ceil(ids.length / SHELF_COUNT));
      for (let i = 0; i < ids.length; i++) {
        const shelfIndex = Math.min(SHELF_COUNT - 1, Math.floor(i / booksPerShelf));
        const position = i % booksPerShelf;
        await sql`
          UPDATE decks SET shelf_index = ${shelfIndex}, position = ${position}
          WHERE id = ${ids[i]};
        `;
      }
    }

    console.log(`Backfilled shelf/position for ${rows.length} deck(s).`);
    console.log("Migration successful.");
  } catch (error) {
    console.error("Error during migration:", error);
    process.exit(1);
  }
}

run();
