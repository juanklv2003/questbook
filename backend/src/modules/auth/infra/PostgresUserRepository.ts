import { neon } from '@neondatabase/serverless';
import { User } from '../domain/User';
import { IUserRepository } from '../domain/IUserRepository';

export class PostgresUserRepository implements IUserRepository {
  private sql: ReturnType<typeof neon>;

  constructor(connectionString: string) {
    this.sql = neon(connectionString);
  }

  async findByEmail(email: string): Promise<User | null> {
    // Case-insensitive: el login normaliza a minúsculas, pero puede haber
    // usuarios creados antes de esa normalización (con mayúsculas).
    const result = await this.sql`
      SELECT id, email, password_hash, provider, provider_id, created_at, updated_at
      FROM users
      WHERE LOWER(email) = LOWER(${email})
    ` as any[];

    if (result.length === 0) return null;

    const row = result[0];
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      provider: row.provider,
      providerId: row.provider_id ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findById(id: string): Promise<User | null> {
    const result = await this.sql`
      SELECT id, email, password_hash, provider, provider_id, created_at, updated_at
      FROM users
      WHERE id = ${id}
    ` as any[];

    if (result.length === 0) return null;

    const row = result[0];
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      provider: row.provider,
      providerId: row.provider_id ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findByProviderAndProviderId(provider: string, providerId: string): Promise<User | null> {
    const result = await this.sql`
      SELECT id, email, password_hash, provider, provider_id, created_at, updated_at
      FROM users
      WHERE provider = ${provider} AND provider_id = ${providerId}
    ` as any[];

    if (result.length === 0) return null;

    const row = result[0];
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      provider: row.provider,
      providerId: row.provider_id ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async save(user: User): Promise<User> {
    // Upsert logic or simply insert if new. Since user creation is mostly insert.
    // If id exists, update, else insert.
    if (user.id) {
      const result = await this.sql`
        UPDATE users
        SET email = ${user.email}, password_hash = ${user.passwordHash}, provider = ${user.provider}, provider_id = ${user.providerId ?? null}, updated_at = NOW()
        WHERE id = ${user.id}
        RETURNING id, email, password_hash, provider, provider_id, created_at, updated_at
      ` as any[];
      const row = result[0];
      return {
        id: row.id,
        email: row.email,
        passwordHash: row.password_hash,
        provider: row.provider,
        providerId: row.provider_id ?? undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } else {
      const result = await this.sql`
        INSERT INTO users (email, password_hash, provider, provider_id)
        VALUES (${user.email}, ${user.passwordHash}, ${user.provider}, ${user.providerId ?? null})
        RETURNING id, email, password_hash, provider, provider_id, created_at, updated_at
      ` as any[];
      const row = result[0];
      return {
        id: row.id,
        email: row.email,
        passwordHash: row.password_hash,
        provider: row.provider,
        providerId: row.provider_id ?? undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }
  }
}