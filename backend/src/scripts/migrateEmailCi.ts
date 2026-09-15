import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined in the environment or .env file");
}

const sql = neon(connectionString);

type CollisionKey = { email_ci: string; count: string };
type CollisionRow = { id: string; email: string; created_at: string };

async function run() {
  const isRollback = process.argv.includes('--down');

  try {
    if (isRollback) {
      console.log("Rolling back migration: dropping uq_users_email_ci...");
      await sql`
        DROP INDEX IF EXISTS uq_users_email_ci;
      `;
      console.log("Rollback successful (idx_users_email left untouched).");
      return;
    }

    console.log("Running migration: enforcing case-insensitive unique email...");

    // Pre-check: find emails that collide once lowercased. The register
    // 409 guard (findByEmail + 23505 catch) cannot see these pairs because
    // the legacy UNIQUE constraint on users.email is case-sensitive.
    const collisions = await sql`
      SELECT LOWER(email) AS email_ci, COUNT(*) AS count
      FROM users
      GROUP BY 1
      HAVING COUNT(*) > 1;
    ` as CollisionKey[];

    if (collisions.length > 0) {
      console.error(
        `Aborting: found ${collisions.length} case-insensitive email collision(s). ` +
        `Resolve them manually (keep the oldest account per group), then re-run.`
      );
      for (const { email_ci, count } of collisions) {
        const rows = await sql`
          SELECT id, email, created_at
          FROM users
          WHERE LOWER(email) = ${email_ci}
          ORDER BY created_at ASC;
        ` as CollisionRow[];
        console.error(`- "${email_ci}" (${count} accounts):`);
        for (const row of rows) {
          console.error(`    id=${row.id} email=${row.email} created_at=${row.created_at}`);
        }
      }
      process.exit(1);
    }

    // No collisions: enforce identity at the DB level. LOWER() lookups in
    // PostgresUserRepository bypass idx_users_email, so this functional
    // index also serves those queries. idx_users_email is kept as-is.
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_ci ON users (LOWER(email));
    `;
    console.log("Created index: uq_users_email_ci ON users (LOWER(email))");
    console.log("Migration successful.");
  } catch (error) {
    console.error("Error during migration:", error);
    process.exit(1);
  }
}

run();
