import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * VITE_API_URL se compila dentro del bundle: si falta en el deploy (Vercel), la
 * app publicada llamaría a rutas del mismo origen que no existen y todo el
 * login/fetch fallaría sin un error claro. Falla ruidosamente en la plataforma.
 *
 * En local el `.env` la deja vacía a propósito (en dev se usa el proxy de Vite a
 * :3000), así que ahí sólo avisamos por consola.
 */
function assertProductionApiUrl(mode: string): void {
  if (mode !== 'production') return

  // loadEnv ya mezcla las variables reales del entorno (las que define Vercel)
  // por encima de los archivos .env.
  const loadedEnv = loadEnv(mode, process.cwd(), 'VITE_')
  const apiUrl = (loadedEnv.VITE_API_URL ?? '').trim()
  // Marcadores de las plataformas de hosting donde el bundle se publica tal cual
  // (Vercel, Netlify, Render, Railway). Fuera de ellas preferimos no romper el
  // build local, sólo avisar.
  const onHostingPlatform = Boolean(
    process.env.VERCEL ||
      process.env.VERCEL_ENV ||
      process.env.NETLIFY ||
      process.env.RENDER ||
      process.env.RAILWAY_ENVIRONMENT
  )

  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(apiUrl)) {
    throw new Error(
      `VITE_API_URL points to localhost ("${apiUrl}"). Use the public API URL of ` +
        'the deployed backend for production builds.'
    )
  }

  if (!apiUrl) {
    if (onHostingPlatform) {
      throw new Error(
        'VITE_API_URL is required for production builds. Set it in the hosting ' +
          'environment (e.g. https://tu-api.onrender.com/api/v1) before building.'
      )
    }
    console.warn(
      '[vite] VITE_API_URL no está definida: el bundle usará /api/v1 del mismo ' +
        'origen (sólo válido detrás de un proxy). En producción definila.'
    )
    return
  }

  // Una URL relativa sólo funciona detrás de un proxy del mismo origen (rewrite
  // en la plataforma). No rompemos el build, pero avisamos.
  if (apiUrl.startsWith('/')) {
    console.warn(
      `[vite] VITE_API_URL="${apiUrl}" es relativa: asegurate de que el hosting ` +
        'haga proxy de /api/* hacia el backend.'
    )
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  assertProductionApiUrl(mode)

  return {
    plugins: [react(), tailwindcss()],
    server: {
      // Same-origin API in dev: OAuth callback sets auth_token on localhost:5173
      // (via Set-Cookie on proxied responses). Avoids cross-port cookie issues.
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3000',
          changeOrigin: false,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              const host = req.headers.host;
              if (host) {
                proxyReq.setHeader('x-forwarded-host', host);
              }
              proxyReq.setHeader('x-forwarded-proto', 'http');
            });
          },
        },
      },
    },
  }
})

