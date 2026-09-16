import crypto from 'crypto';
import { neon } from '@neondatabase/serverless';
import { env } from '../../../config/env';

const TTL_MS = 2 * 60 * 1000;

const sql = neon(env.DATABASE_URL);

let tableReady: Promise<void> | null = null;

async function ensureTable(): Promise<void> {
  if (!tableReady) {
    tableReady = sql`
      CREATE TABLE IF NOT EXISTS oauth_exchange_codes (
        code TEXT PRIMARY KEY,
        token TEXT NOT NULL,
        user_id UUID NOT NULL,
        email TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL
      )
    `.then(() => undefined);
  }
  return tableReady;
}

export async function createOAuthExchangeCode(
  sessionToken: string,
  user: { id: string; email: string }
): Promise<string> {
  await ensureTable();
  const code = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + TTL_MS);
  await sql`
    INSERT INTO oauth_exchange_codes (code, token, user_id, email, expires_at)
    VALUES (${code}, ${sessionToken}, ${user.id}, ${user.email}, ${expiresAt.toISOString()})
  `;
  return code;
}

export async function consumeOAuthExchangeCode(
  code: string
): Promise<{ token: string; user: { id: string; email: string } } | null> {
  await ensureTable();
  const rows = (await sql`
    DELETE FROM oauth_exchange_codes
    WHERE code = ${code} AND expires_at > NOW()
    RETURNING token, user_id, email
  `) as { token: string; user_id: string; email: string }[];

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  return {
    token: row.token,
    user: { id: row.user_id, email: row.email },
  };
}
