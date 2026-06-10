import 'dotenv/config'; // Ensure env is loaded before importing config
import app from './app';
import { env } from './config/env';
import { db } from './config/db';

const startServer = async () => {
  try {
    // Quick DB check
    await db.query('SELECT 1');
    console.log('✅ Database connection verified.');

    const port = env.PORT || 3000;
    app.listen(port, () => {
      console.log(`🚀 Server is running on port ${port}`);
    });
  } catch (error) {
    console.error('❌ Failed to start the server:', error);
    process.exit(1);
  }
};

startServer();
