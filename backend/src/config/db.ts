import { Pool } from '@neondatabase/serverless';
import { env } from './env';

export const db = new Pool({
  connectionString: env.DATABASE_URL,
});

db.on('connect', () => {
  console.log('📦 Connected to Neon Database');
});

db.on('error', (err: Error) => {
  console.error('❌ Unexpected error on idle client', err);
  // Don't exit the process on database errors - let individual requests handle them
  // The Neon driver should handle reconnection automatically
});
