import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined in the environment or .env file");
}

const sql = neon(connectionString);

async function migratePasswordReset() {
  try {
    console.log("Running migration: password_reset_tokens...");

    // Tokens de un solo uso con expiración corta (15 min). Se guarda el
    // SHA-256 del token (nunca el valor en claro): si la DB se filtra, los
    // tokens no sirven sin el original que solo conoce el cliente.
    await sql`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        used_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    console.log("Created table: password_reset_tokens");

    await sql`
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id
      ON password_reset_tokens (user_id);
    `;
    console.log("Created index: idx_password_reset_tokens_user_id");

    console.log("Password-reset migration completed successfully.");
  } catch (error) {
    console.error("Error running password-reset migration:", error);
    process.exit(1);
  }
}

migratePasswordReset();
