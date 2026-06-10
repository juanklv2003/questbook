import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined in the environment or .env file");
}

const sql = neon(connectionString);

async function migrateAuth() {
  try {
    console.log("Connecting to the database for Auth Migration...");

    // 1. Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    console.log("Created table: users");

    await sql`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
    `;
    console.log("Created index: idx_users_email");

    // 2. Insert a Legacy User (if we need one for existing decks)
    const legacyEmail = 'legacy@flashyia.local';
    const legacyPasswordHash = 'LEGACY_NO_LOGIN'; // Cannot be logged into directly without reset

    // Check if legacy user exists
    const users = await sql`SELECT id FROM users WHERE email = ${legacyEmail}`;
    let legacyUserId;

    if (users.length === 0) {
      const inserted = await sql`
        INSERT INTO users (email, password_hash) 
        VALUES (${legacyEmail}, ${legacyPasswordHash}) 
        RETURNING id;
      `;
      legacyUserId = inserted[0].id;
      console.log(`Created legacy user with id: ${legacyUserId}`);
    } else {
      legacyUserId = users[0].id;
      console.log(`Found existing legacy user with id: ${legacyUserId}`);
    }

    // 3. Add user_id to decks (if not exists)
    // To do this safely, we add the column, update the rows, then add NOT NULL and FK.
    await sql`
      ALTER TABLE decks ADD COLUMN IF NOT EXISTS user_id UUID;
    `;
    console.log("Added column: user_id to decks");

    // Update existing decks to belong to legacy user
    await sql`
      UPDATE decks SET user_id = ${legacyUserId} WHERE user_id IS NULL;
    `;
    console.log("Assigned existing decks to legacy user");

    // Add FK constraint (drop if exists first to be safe or use IF NOT EXISTS workaround)
    // Neon Postgres allows creating constraints
    try {
      await sql`
        ALTER TABLE decks ADD CONSTRAINT fk_decks_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
      `;
      console.log("Added FK constraint fk_decks_user");
    } catch (e: any) {
      if (e.code === '42710') {
         console.log("FK constraint fk_decks_user already exists.");
      } else {
         throw e;
      }
    }

    // Make user_id NOT NULL
    await sql`
      ALTER TABLE decks ALTER COLUMN user_id SET NOT NULL;
    `;
    console.log("Set user_id NOT NULL on decks");

    // Add index on user_id
    await sql`
      CREATE INDEX IF NOT EXISTS idx_decks_user_id ON decks (user_id);
    `;
    console.log("Created index: idx_decks_user_id");

    console.log("Auth Migration completed successfully.");
  } catch (error) {
    console.error("Error running Auth Migration:", error);
    process.exit(1);
  }
}

migrateAuth();
