import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

const sql = neon(connectionString);

async function migrateGoogleAuth() {
  console.log('Adding Google OAuth columns to users (if missing)...');

  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS provider VARCHAR(50) NOT NULL DEFAULT 'email'
  `;
  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS oauth_exchange_codes (
      code TEXT PRIMARY KEY,
      token TEXT NOT NULL,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL
    )
  `;

  console.log('Google auth migration completed.');
}

migrateGoogleAuth().catch((err) => {
  console.error(err);
  process.exit(1);
});
