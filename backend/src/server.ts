import 'dotenv/config'; // Ensure env is loaded before importing config
import app from './app';
import { env } from './config/env';
import { db } from './config/db';
import { applySafeSchemaPatches, warnIfSchemaOutdated } from './config/schemaGuard';

// Render/Railway/Vercel: correct req.protocol for OAuth redirect_uri behind HTTPS proxy
app.set('trust proxy', 1);

const startServer = async () => {
  try {
    // Quick DB check
    await db.query('SELECT 1');
    console.log('✅ Database connection verified.');

    // Parches idempotentes (ej. pdf_source_names) y aviso si aún falta algo manual.
    await applySafeSchemaPatches();
    await warnIfSchemaOutdated();

    const port = env.PORT || 3000;
    const longRequestMs = env.AI_DECK_TOTAL_TIMEOUT_MS;
    const server = app.listen(port, () => {
      console.log(`🚀 Server is running on port ${port} (pid ${process.pid}, node ${process.version})`);
      console.log(
        `   Google OAuth: ${env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? 'configured' : 'missing GOOGLE_* env vars'}`
      );
      if (env.GOOGLE_CALLBACK_URL) {
        console.log(`   GOOGLE_CALLBACK_URL=${env.GOOGLE_CALLBACK_URL}`);
      }
      console.log(`   CORS origins: ${env.CORS_ORIGINS.join(', ')}`);
      console.log(`   Verify: curl http://localhost:${port}/api/v1/health`);
    });

    // Render documenta timeouts y "Connection reset by peer" en servicios Node
    // con requests largos (aquí una generación con IA puede tardar minutos).
    // - requestTimeout: tiempo máximo para RECIBIR la petición (el multipart del
    //   PDF); el default de Node (~300s) podría cortar subidas lentas de PDFs grandes.
    // - keepAliveTimeout: inactividad permitida sobre una conexión ya usada, para que
    //   el navegador pueda reutilizarla después de una generación larga.
    // - headersTimeout debe quedar por encima de keepAliveTimeout (Node exige
    //   headersTimeout > keepAliveTimeout para no cortar conexiones vivas).
    server.requestTimeout = longRequestMs + 5_000;
    server.keepAliveTimeout = longRequestMs;
    server.headersTimeout = longRequestMs + 5_000;

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

    // Cierre ordenado: Render/Railway mandan SIGTERM en cada deploy o restart.
    // Dejamos terminar las respuestas en vuelo (hay generaciones de IA de hasta
    // 2 min) y forzamos la salida un poco antes del SIGKILL de la plataforma.
    let shuttingDown = false;
    const shutdown = (signal: NodeJS.Signals) => {
      if (shuttingDown) return;
      shuttingDown = true;
      console.log(`\n${signal} received: closing HTTP server (draining requests)...`);
      server.close(() => {
        console.log('HTTP server closed. Bye.');
        process.exit(0);
      });
      setTimeout(() => {
        console.error('Forcing exit after 15s grace period.');
        process.exit(1);
      }, 15_000).unref();
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    // Los rechazos no manejados se loguean pero no tumban el servicio: un crash
    // a mitad de una request es peor que seguir vivo con un error registrado.
    process.on('unhandledRejection', (reason) => {
      console.error('UNHANDLED REJECTION:', reason);
    });
    process.on('uncaughtException', (error) => {
      console.error('UNCAUGHT EXCEPTION:', error);
    });
  } catch (error) {
    console.error('❌ Failed to start the server:', error);
    process.exit(1);
  }
};

startServer();

