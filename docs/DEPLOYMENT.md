# Despliegue de QuestBook

Guía para publicar la web: **frontend en Vercel o Netlify** y **backend en Render o Railway**,
con la base de datos Neon (Postgres) y los servicios externos ya configurados.

```
Usuario ─► Frontend (Vercel/Netlify)  ──XHR con cookie──►  Backend (Render/Railway) ─► Neon
   *.vercel.app                      CORS + SameSite=None        *.onrender.com
```

> **Elegí los nombres primero.** Los dominios son únicos por plataforma y algunos ya están tomados:
> `andel.vercel.app` y `questbook.vercel.app` pertenecen a otros proyectos (verificado), mientras que
> `myquestbook.vercel.app` y `flashcards-ia.vercel.app` están libres. En Render, el `name` del
> blueprint define la URL `*.onrender.com`: si ya existe, Render te lo va a avisar al crear el
> servicio. Los ejemplos de esta guía usan `flashcards-ia.vercel.app` y
> `flashcards-ia-api.onrender.com`; si cambiás alguno, actualizá en cadena `VITE_API_URL` (Vercel) →
> `FRONTEND_URL` (Render) → Google Console → Turnstile.

---

## 0. Checklist antes de tocar producción

Local, con los gates en verde:

```bash
# Backend
cd backend && npm run build && npm start     # responde /api/v1/health
# Frontend
cd frontend && npm run build && npm run lint # tsc -b + vite build + eslint sin errores
```

- [ ] `/api/v1/health` devuelve `{"status":"ok"}` localmente.
- [ ] El login funciona en local (`npm run dev` en ambos lados).
- [ ] Tenés a mano: `DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY`, las 3 credenciales de Cloudinary, el Secret Key de Turnstile.

---

## 1. Base de datos (Neon)

1. Entrá al proyecto de Neon y copiá el **connection string** (pooled, con `?sslmode=require`).
2. Aplicá el esquema y las migraciones **desde tu máquina, apuntando a la DB de producción**:

```bash
cd backend
# .env con DATABASE_URL apuntando a la DB de PRODUCCIÓN
npx ts-node src/scripts/migrateAuth.ts     # PRIMERO: crea la tabla `users`
npx ts-node src/scripts/initDb.ts          # crea study_sessions con FK a users(id)
npx ts-node src/scripts/migrateColor.ts
npx ts-node src/scripts/migrateEmailCi.ts      # valida colisiones de email; aborta si hay duplicados
npx ts-node src/scripts/migratePdfStorage.ts
npx ts-node src/scripts/migrateProgress.ts
npx ts-node src/scripts/migrateShelf.ts
npx ts-node src/scripts/migrateStudySessions.ts   # crea la tabla más reciente
npx ts-node src/scripts/migratePasswordReset.ts   # tabla password_reset_tokens (recupero sin SMTP)
npm run migrate:google-auth                       # OAuth Google (provider, oauth_exchange_codes)
npm run migrate:flashcards-index                  # índice flashcards(deck_id) — rendimiento listado
```

> Las migraciones son idempotentes (usan `IF NOT EXISTS`), así que re-ejecutarlas es seguro.
> **`migrateAuth` va antes que `initDb`**: `initDb` crea `study_sessions` con FK a `users(id)`
> y esa tabla la crea `migrateAuth`; en una base nueva el orden inverso falla con
> `relation "users" does not exist`.
> `migrateEmailCi` es la única que puede abortar a propósito: si detecta emails duplicados
> que sólo difieren en mayúsculas, resolvelos a mano (conservá la cuenta más antigua) y volvé a correr.

---

## 2. Backend en Render

1. **New → Blueprint** y elegí este repo: Render lee `render.yaml` de la raíz (servicio `flashcards-ia-api`,
   `rootDir: backend`, health check en `/api/v1/health`).
   - Alternativa manual: **New → Web Service**, Root Directory = `backend`,
     Build Command = `npm ci --include=dev && npm run build`, Start Command = `npm start`.
     - **`--include=dev` no es opcional**: con `NODE_ENV=production` (que este blueprint define)
       npm omite `devDependencies`, y como `typescript` vive ahí el build falla con
       `tsc no se reconoce`. Verificado localmente con `npm ls typescript` en ambos modos.
2. Completá las variables marcadas como secretas en el dashboard:

| Variable | Valor |
| --- | --- |
| `NODE_ENV` | `production` |
| `COOKIE_SAME_SITE` | `none` (dominios distintos) · `lax` (subdominios del mismo dominio) |
| `DATABASE_URL` | connection string de Neon |
| `JWT_SECRET` | string largo y aleatorio (no reutilices el de dev) |
| `TURNSTILE_SECRET_KEY` | Secret Key de Cloudflare Turnstile (https://dash.cloudflare.com/?to=/:account/turnstile). Sin esto el backend no arranca y el registro devuelve 400 |
| `FRONTEND_URL` | origen exacto del frontend, **sin barra final** (ej. `https://flashcards-ia.vercel.app`) |
| `CORS_ORIGINS` | opcional: orígenes extra permitidos, separados por comas (ej. previews de Vercel `https://tu-app-git-rama.vercel.app`). `FRONTEND_URL` siempre está permitido |
| `GEMINI_API_KEY` | clave de Gemini |
| `GEMINI_API_KEYS` | opcional: claves extra separadas por comas (failover, misma cuenta) |
| `GEMINI_API_KEY2` | opcional: clave de otro proyecto/cuenta; se usa al final cuando las anteriores agotan cuota |
| `GROQ_API_KEY` | opcional: respaldo Groq cuando Gemini agota todas las claves |
| `GROQ_MODEL` | opcional; default `llama-3.3-70b-versatile` |
| `MAX_PDF_UPLOAD_MB` | opcional; default **100**. El PDF vive en RAM durante `POST /decks/generate` (multer + copia del worker de pdf-parse + subida a Cloudinary): en el plan free (≈512 MB) un PDF de 100 MB puede provocar OOM/502. Si pasa, bajalo (ej. `25`) o pasá a un plan pago |
| `DB_POOL_MAX` | opcional; default **10** conexiones al pool Neon |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | credenciales de Cloudinary |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | opcional: OAuth Google (sin las dos, el botón no inicia flujo) |
| `GOOGLE_CALLBACK_URL` | opcional; en prod suele ser `https://<tu-api>/api/v1/auth/google/callback` (debe coincidir con Google Console) |

**Rendimiento / abuso:** el API aplica rate limits (auth, generación IA ~5/h, evaluaciones ~60/h por usuario), compresión gzip y `helmet` en respuestas JSON. En Render free, evitá **varias subidas de PDF grandes a la vez** (hasta 100 MB en memoria por request) y revisá los logs por OOM si subís archivos muy pesados.

3. Deployá y verificá:

```bash
curl https://flashcards-ia-api.onrender.com/api/v1/health      # {"status":"ok"}
```

> **Plan free de Render:** el servicio se duerme tras ~15 min sin tráfico; la primera petición
> tarda ~30-60 s en despertar. Si el frontend muestra un error de red al entrar, es esto:
> recargá y entrá. Con plan pago o un ping periódico se evita.

> **Versión de Node:** el runtime se fija con `.node-version` (raíz del repo → `24`) y con
> `engines.node: "24.x"` en `backend/package.json` y `frontend/package.json`. No lo bajes a 20:
> el backend necesita Node ≥ 22.3 (`pdf-parse`) y ≥ 21 (WebSocket global que usa el driver de
> Neon vía `Pool`); con Node 20 habría que agregar el paquete `ws`. El frontend necesita
> ≥ 22.13 o 24 (`vite@8`, `eslint@10`).

### Railway (alternativa)

1. **New Project → Deploy from GitHub repo**.
2. Settings → Root Directory = `backend`; Build = `npm ci --include=dev && npm run build`; Start = `npm start`.
3. Cargá las mismas variables de la tabla y generá el dominio público.
4. Copiá ese dominio para el paso 3 (`VITE_API_URL`).

**¿Cookie rota?** Si el login "funciona" pero al recargar volvés al login, es la cookie:
revisá que `FRONTEND_URL` sea exactamente el origen del frontend, que `COOKIE_SAME_SITE=none`
(y con `secure`, o sea HTTPS) y que el frontend haga las peticiones con credenciales
(`withCredentials: true` ya está en `src/lib/axios.ts`).
---

## 3. Frontend en Vercel

1. **Add New → Project** e importá el repo.
2. Configuración:
   - **Root Directory**: `frontend`
   - Framework preset: **Vite** (Build `npm run build`, Output `dist`) — ya está en `frontend/vercel.json`,
     que además incluye el rewrite a `index.html` para que las rutas del SPA no den 404 al recargar.
3. **Environment Variables** (antes del build: `VITE_API_URL` se compila dentro del bundle):

| Variable | Valor |
| --- | --- |
| `VITE_API_URL` | **`/api/v1`** (recomendado: proxy en `vercel.json` → Render; cookies en el mismo origen). Alternativa directa: `https://flashcards-ia-api.onrender.com/api/v1` (requiere `COOKIE_SAME_SITE=none` y el navegador puede bloquear la cookie) |
| `VITE_TURNSTILE_SITE_KEY` | Site Key pública del mismo sitio de Turnstile. Sin esto el form de registro muestra un aviso y el botón queda deshabilitado |

4. Deployá, copiá la URL final (`https://flashcards-ia.vercel.app`, o la que te asigne Vercel) y
   **volvé al paso 2** para fijarla como
   `FRONTEND_URL` del backend (si no, CORS bloquea todo) → el backend se redeploya solo.

### Netlify (alternativa)

1. **Add new site → Import an existing project**, Base directory = `frontend`.
2. `frontend/netlify.toml` ya define `npm run build`, `publish = dist` y el redirect del SPA.
3. Misma variable `VITE_API_URL` en *Site configuration → Environment variables*.

---

## 4. Humo post-deploy (5 minutos)

1. **Health**: `curl .../api/v1/health` → `{"status":"ok"}`.
2. **Registro**: creá una cuenta desde la web → entrás directo a la app.
3. **Sesión persistente**: recargá la página (F5) → seguís logueado (prueba la cookie `secure`).
4. **Logout**: cerrás sesión y al recargar quedás fuera.
5. **Login**: entrás de nuevo con la misma cuenta + probá "Mantener sesión iniciada".
6. **Flujo principal**: subí un PDF, generá flashcards, abrí una sesión de estudio y evaluá.
7. **DevTools → Network**: ninguna petición debe quedar bloqueada por CORS ni devolver 401 inesperado.

---

## 5. Errores frecuentes

| Síntoma | Causa | Solución |
| --- | --- | --- |
| CORS bloqueado en el navegador | `FRONTEND_URL` no coincide exactamente con el origen | Igualalo al dominio real, sin barra final |
| Login entra pero al recargar vuelve al login | Cookie `strict`/`lax` entre dominios distintos, o `secure` sobre HTTP | `COOKIE_SAME_SITE=none` + HTTPS |
| `Missing required env var` al arrancar | Falta una variable en el panel del hosting | Completá la tabla del paso 2 |
| 500 al subir PDF | Credenciales de Cloudinary incorrectas | Revisá las 3 claves |
| 503 al generar flashcards | Sin claves de Gemini válidas | Revisá `GEMINI_API_KEY` / `GEMINI_API_KEYS` |
| Primera carga lenta | Servicio dormido (plan free de Render) | Recargar; o plan pago |
| Rutas dan 404 al recargar | Falta el rewrite del SPA | `vercel.json` / `netlify.toml` (ya incluidos) |
| Estilos viejos tras deploy | Assets con hash: sólo caché del navegador | Ctrl+F5 |

---

## 6. Notas

- **Secretos**: nunca commitees `.env`. En el hosting van como variables de entorno.
  El código las lee vía `backend/src/config/env.ts` (Zod valida al arrancar y falla ruidosamente si falta alguna).
- **Redeploy**: cada push a `main` reconstruye frontend y backend automáticamente.
- **Dominio propio** (recomendado a futuro): `app.tudominio.com` (frontend) + `api.tudominio.com` (backend).
  Con subdominios del mismo dominio alcanza `COOKIE_SAME_SITE=lax` (más seguro que `none`) y
  mejora el comportamiento de cookies de terceros en navegadores restrictivos.