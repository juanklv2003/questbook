import 'dotenv/config'; // Ensure env is loaded before importing config
import app from './app';
import { env } from './config/env';
import { db } from './config/db';

// Render/Railway/Vercel: correct req.protocol for OAuth redirect_uri behind HTTPS proxy
app.set('trust proxy', 1);

const startServer = async () => {
  try {
    // Quick DB check
    await db.query('SELECT 1');
    console.log('✅ Database connection verified.');

    const port = env.PORT || 3000;
    const server = app.listen(port, () => {
      console.log(`🚀 Server is running on http://localhost:${port} (pid ${process.pid})`);
      console.log(
        `   Google OAuth: ${env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? 'configured' : 'missing GOOGLE_* env vars'}`
      );
      if (env.GOOGLE_CALLBACK_URL) {
        console.log(`   GOOGLE_CALLBACK_URL=${env.GOOGLE_CALLBACK_URL}`);
      }
      console.log(`   Verify: curl http://localhost:${port}/api/v1/health`);
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.error(
          `❌ Port ${port} is already in use. Another backend is still running (often an old ts-node).`
        );
        console.error('   Windows: netstat -ano | findstr :' + port);
        console.error('   Then stop that PID in Task Manager or: taskkill /PID <pid> /F');
        console.error('   Or run on another port: $env:PORT=3001; npm run dev');
      } else {
        console.error('❌ Failed to start HTTP server:', err);
      }
      process.exit(1);
    });
  } catch (error) {
    console.error('❌ Failed to start the server:', error);
    process.exit(1);
  }
};

startServer();
