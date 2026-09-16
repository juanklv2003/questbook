import { neon } from '@neondatabase/serverless';
import {
  IPasswordResetRepository,
  PasswordResetToken,
} from '../domain/IPasswordResetRepository';

function toEntity(row: any): PasswordResetToken {
  return {
    id: row.id,
    userId: row.user_id,
    tokenHash: row.token_hash,
    expiresAt: new Date(row.expires_at),
    usedAt: row.used_at ? new Date(row.used_at) : null,
    createdAt: new Date(row.created_at),
  };
}

export class PostgresPasswordResetRepository implements IPasswordResetRepository {
  private sql: ReturnType<typeof neon>;

  constructor(connectionString: string) {
    this.sql = neon(connectionString);
  }

  async create(userId: string, tokenHash: string, expiresAt: Date): Promise<PasswordResetToken> {
    const result = await this.sql`
      INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
      VALUES (${userId}, ${tokenHash}, ${expiresAt.toISOString()})
      RETURNING id, user_id, token_hash, expires_at, used_at, created_at
    ` as any[];
    return toEntity(result[0]);
  }

  async findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null> {
    const result = await this.sql`
      SELECT id, user_id, token_hash, expires_at, used_at, created_at
      FROM password_reset_tokens
      WHERE token_hash = ${tokenHash}
      LIMIT 1
    ` as any[];
    if (result.length === 0) return null;
    return toEntity(result[0]);
  }

  async markAsUsed(id: string): Promise<void> {
    await this.sql`
      UPDATE password_reset_tokens
      SET used_at = NOW()
      WHERE id = ${id}
    `;
  }
}
