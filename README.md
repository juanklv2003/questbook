# QuestBook — Flashcards con IA

Subí un PDF y generá tarjetas de estudio con IA. Repasá con sesiones guiadas, evaluá tus
respuestas con IA y seguí tu progreso desde una biblioteca tipo estantería.

- Repo: `flashcards-ia` · API en `/api/v1` (Express 5) · SPA en React 19 + Vite
- Base de datos: Postgres en Neon · PDFs: Cloudinary · IA: Gemini con failover + respaldo Groq

## Estado actual

- **Gates en verde**: `tsc` (backend y frontend), `vite build` y `eslint` (0 errores) sin fallos.
- **Listo para desplegar**: frontend en Vercel + backend en Render + Neon, con `render.yaml` y
  `frontend/vercel.json` incluidos y la configuración de cookies/CORS para dominios cruzados.
- **Nada desplegado todavía**: no hay servicios creados en Render ni Vercel (los pasos están en
  [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)).

## Características

- **Autenticación**: registro y login con email + contraseña, verificación humana con Cloudflare
  Turnstile en el registro, Google OAuth y recupero de contraseña con token de un solo uso (sin
  SMTP: la app muestra el token). Sesión por JWT en cookie `HttpOnly`.
- **Generación con IA**: subís un PDF (hasta `MAX_PDF_UPLOAD_MB`, default 100 MB) y la IA genera las
  tarjetas. El texto se extrae en un `worker_threads` (no bloquea el event loop), con failover de
  claves de Gemini y respaldo Groq cuando se agota la cuota gratuita.
- **Estudio**: evaluación de respuestas por IA (score 0-100 normalizado en el servidor), progreso
  por mazo persistido en DB y reanudable, con fallback offline en `localStorage`.
- **Biblioteca**: estanterías con drag & drop, colores de lomo, paneles de progreso y ajustes
  (temas, fondos, patrones), interfaz en **ES/EN**.

## Stack

- **Backend** (`backend/`): Node.js 24 + Express 5 + TypeScript (`strict`), Postgres vía
  `@neondatabase/serverless`, Zod para validación, `multer` (upload en memoria), `pdf-parse` en
  worker, `helmet`, `compression`, `express-rate-limit`, `cloudinary`, `jsonwebtoken`, `bcrypt`.
- **Frontend** (`frontend/`): React 19 + Vite + TypeScript, Tailwind CSS v4, Atomic Design +
  Container/Presentational, `axios`, `lucide-react`, `framer-motion`.

> **Requisito de Node:** **24** (`.node-version` en la raíz y `engines.node` en ambos `package.json`).
> El backend necesita ≥ 22.3 (`pdf-parse`) y ≥ 21 (WebSocket global del driver de Neon); el frontend,
> ≥ 22.13 o 24 (`vite@8` / `eslint@10`). No lo bajes sin revisar esos engines.


## Estructura

```
backend/
  src/
    config/           env (Zod) y pool de Postgres
    core/             ai (failover Gemini/Groq), errores, middlewares, validación
    modules/          auth | decks | flashcards | evaluations
                      (domain/ ports · useCases/ · infra/ adapters · http/ routers)
    scripts/          initDb + migraciones idempotentes
    workers/          pdfExtractWorker (worker_threads)
frontend/
  src/
    components/       atoms · molecules · organisms · containers
    contexts/         Auth (sesión) y Deck (biblioteca compartida: 1 GET /decks por sesión)
    hooks/            generación, estudio, evaluador, estantería, tema
    i18n/             diccionarios ES/EN
    lib/              axios + apiBase, quota, shelfUtils, theme, shuffle, uploadConfig
docs/                 DEPLOYMENT.md (runbook) y project-context.md (arquitectura)
render.yaml           blueprint del backend en Render
```

## Arranque local

### 1. Base de datos (Neon)

Copiá el connection string (pooled, con `?sslmode=require`) en `backend/.env` y aplicá el schema.
Las migraciones son idempotentes (`IF NOT EXISTS`); **`migrateAuth` va antes de `initDb`** porque
`initDb` crea `study_sessions` con FK a `users(id)`:

```bash
cd backend
npx ts-node src/scripts/migrateAuth.ts
npx ts-node src/scripts/initDb.ts
npx ts-node src/scripts/migrateColor.ts
npx ts-node src/scripts/migrateEmailCi.ts      # aborta si hay emails duplicados (ignorando mayúsculas)
npx ts-node src/scripts/migratePdfStorage.ts
npx ts-node src/scripts/migrateProgress.ts
npx ts-node src/scripts/migrateShelf.ts
npx ts-node src/scripts/migrateStudySessions.ts
npx ts-node src/scripts/migratePasswordReset.ts
npm run migrate:google-auth
npm run migrate:flashcards-index
```

### 2. Backend (puerto 3000)

```bash
cd backend
npm install
cp .env.example .env       # completar (Neon, Gemini, JWT, Turnstile, Cloudinary)
npm run dev
```

### 3. Frontend (puerto 5173)

```bash
cd frontend
npm install
cp .env.example .env       # VITE_API_URL=/api/v1 → el proxy de Vite apunta a :3000
npm run dev
```

Servicios locales: API + health en `http://localhost:3000/api/v1/health` y web en
`http://localhost:5173` (el proxy `/api` mantiene la cookie en el mismo origen, necesario para el
intercambio de Google OAuth).

### 4. Verificación rápida

```bash
curl http://localhost:3000/api/v1/health      # {"status":"ok", ...}
curl http://localhost:3000/api/v1/decks       # 401 sin sesión (correcto)
curl http://localhost:3000/api/v1/no-existe   # 404 en JSON
```

## Variables de entorno

### Backend (`backend/.env`)

| Variable | Obligatoria | Notas |
| --- | --- | --- |
| `DATABASE_URL` | sí | connection string pooled de Neon |
| `JWT_SECRET` | sí | largo y aleatorio (distinto al de dev) |
| `TURNSTILE_SECRET_KEY` | sí | sin esto el backend no arranca y el registro da 400 |
| `GEMINI_API_KEY` | sí | clave principal de Gemini |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | sí | almacenamiento de PDFs |
| `FRONTEND_URL` | sí en prod | origen exacto del frontend, sin barra final |
| `GEMINI_API_KEYS` / `GEMINI_API_KEY2` | no | claves extra para failover (misma cuenta / otra cuenta) |
| `GROQ_API_KEY` / `GROQ_MODEL` | no | respaldo al agotar cuota de Gemini (default `llama-3.3-70b-versatile`) |
| `CORS_ORIGINS` | no | orígenes extra permitidos (previews de Vercel), separados por coma |
| `COOKIE_SAME_SITE` | no | default `none` en producción / `lax` en desarrollo |
| `MAX_PDF_UPLOAD_MB` | no | default 100 (ver *Límites conocidos*) |
| `PDF_MAX_TEXT_CHARS` / `AI_DECK_TIMEOUT_MS` | no | default 1.000.000 caracteres (máx. 4.000.000 ≈ 1M tokens) / 120.000 ms |
| `AI_DECK_PROMPT_CHARS_PER_CALL` | no | default 200.000 caracteres por llamada a la IA (máx. 500.000); el documento se reparte en ventanas |
| `DB_POOL_MAX` | no | default 10 conexiones |
| `GOOGLE_CLIENT_ID` / `_SECRET` / `_CALLBACK_URL` | no | Google OAuth (sin las tres, el botón no funciona) |

### Frontend (`frontend/.env`)

| Variable | Notas |
| --- | --- |
| `VITE_API_URL` | dev: `/api/v1` (proxy Vite). **Prod en Vercel:** **`/api/v1`** + rewrite en [`frontend/vercel.json`](frontend/vercel.json) hacia Render (cookies en el mismo origen). Alternativa: URL absoluta `https://<tu-api>/api/v1` (CORS + `SameSite=None`, menos fiable) |
| `VITE_TURNSTILE_SITE_KEY` | Site Key pública de Turnstile; sin ella el registro queda deshabilitado |

## Scripts

```bash
# Backend
npm run dev                       # ts-node src/server.ts
npm run build                     # tsc -> dist/
npm start                         # node dist/server.js (producción)
npm run migrate:google-auth       # OAuth Google (provider, oauth_exchange_codes)
npm run migrate:flashcards-index  # índice flashcards(deck_id)

# Frontend
npm run dev                       # Vite (proxy /api -> :3000)
npm run build                     # tsc -b && vite build -> dist/
npm run lint                      # eslint .
npm run preview                   # sirve dist/ localmente
```

## API (resumen)

| Método y ruta | Auth | Qué hace |
| --- | --- | --- |
| `GET /api/v1/health` | — | estado, versión de Node, límite de upload y si Groq está configurado |
| `POST /api/v1/auth/register` | — | crea usuario (exige Turnstile) y setea la cookie |
| `POST /api/v1/auth/login` | — | login (`rememberMe`: cookie/JWT 30 d vs 1 d) |
| `POST /api/v1/auth/logout` | ✓ | limpia la cookie con los mismos flags |
| `GET /api/v1/auth/me` | ✓ | usuario actual |
| `POST /api/v1/auth/forgot-password` / `reset-password` | — | recupero con token de un solo uso (15 min) |
| `GET /api/v1/auth/google` + `/google/callback` | — | OAuth; el callback redirige al frontend con `oauth_code` |
| `POST /api/v1/auth/oauth/exchange` | — | canjea ese código por la cookie de sesión |
| `POST /api/v1/decks/generate` | ✓ | multipart (`file`, `name`, `cardCount`, `difficulty`, `language`, `color`, `shelf_index`): sube el PDF a Cloudinary y genera las tarjetas |
| `GET /api/v1/decks` | ✓ | biblioteca (contadores y % de progreso por mazo) |
| `GET /api/v1/decks/:deckId/flashcards` | ✓ | tarjetas + deck (sólo el dueño) |
| `PATCH /api/v1/decks/:id/shelf` | ✓ | mueve el mazo dentro de la estantería |
| `GET` / `PATCH` / `DELETE /api/v1/decks/:id/session` | ✓ | progreso de estudio (reanudable) |
| `DELETE /api/v1/decks/:id` | ✓ | borra el mazo y su PDF en Cloudinary |
| `POST /api/v1/evaluations/evaluate` | ✓ | evalúa una respuesta y actualiza el progreso del mazo |

Validación (controller-level con Zod): cuerpo/param inválido → `400 { error }` con el primer
problema; sin sesión → `401`; mazo ajeno → `403`; cuota de IA agotada → `429` con
`retryAfterSeconds`; modelo saturado → `503`; ruta inexistente → `404` en JSON.

## Checklist primer deploy

**En el repo (listo):**

| Área | Qué hay |
| --- | --- |
| Build | `backend`: `npm run build` · `frontend`: `tsc -b`, `vite build`, `eslint` sin errores |
| Backend hosting | [`render.yaml`](render.yaml): build con devDeps, health `/api/v1/health`, env placeholders |
| Frontend hosting | [`frontend/vercel.json`](frontend/vercel.json): rewrite SPA, cache de assets, headers |
| Prod guard | [`frontend/vite.config.ts`](frontend/vite.config.ts) exige `VITE_API_URL` en el build de hosting; en Vercel preferí **`/api/v1`** con proxy |
| Seguridad / carga | CORS, cookies cross-origin, rate limits, compresión, validación `%PDF-`, worker PDF |

**Pendiente manual (todavía no hay nada en Vercel ni Render):**

- [ ] Neon de **producción** + migraciones en el orden de [Arranque local](#1-base-de-datos-neon).
- [ ] Render: Blueprint → secretos del backend (`DATABASE_URL`, `JWT_SECRET`, Turnstile, Gemini, Cloudinary, etc.).
- [ ] Vercel: root `frontend`, `VITE_API_URL=/api/v1` + `VITE_TURNSTILE_SITE_KEY` **antes** del primer build (proxy en `vercel.json`).
- [ ] Render: `FRONTEND_URL` = URL final de Vercel (sin `/` final); opcional `CORS_ORIGINS` para previews.
- [ ] Google OAuth (opcional pero recomendado): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` en Render + redirect en Google Console.
- [ ] Turnstile: dominio del frontend en el widget de Cloudflare.
- [ ] Humo post-deploy: los 7 pasos de [`docs/DEPLOYMENT.md` §4](docs/DEPLOYMENT.md#4-humo-post-deploy-5-minutos).

Si todo eso pasa, la app está preparada para el primer deploy real; el runbook detallado está en
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Despliegue (Vercel + Render)

Runbook completo con troubleshooting: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). Resumen:

1. **Neon**: elegir la DB de producción y correr las migraciones en el orden de arriba.
2. **Render** (backend): New → **Blueprint** con `render.yaml` (rootDir `backend`,
   `npm ci --include=dev && npm run build`, health check `/api/v1/health`). Cargar los secretos
   (incluidas `GOOGLE_*` si querés el botón de Google).
3. **Vercel** (frontend): importar el repo, **Root Directory = `frontend`** (preset Vite) y definir
   `VITE_API_URL=/api/v1` + `VITE_TURNSTILE_SITE_KEY` **antes** del build.
4. Volver a Render y fijar `FRONTEND_URL` con la URL final de Vercel (si no, CORS bloquea todo).
5. **Google Console**: registrar el redirect `https://<tu-api>/api/v1/auth/google/callback` y el
   origen JS del frontend. **Turnstile**: incluir el dominio del frontend.
6. Smoke test: los 7 puntos de la sección 4 del runbook (health, registro, recarga con sesión,
   logout, login, generar mazo, evaluar).

> **Nombres de dominio**: son únicos por plataforma. `andel.vercel.app` y `questbook.vercel.app` ya
> están ocupados por otros proyectos, y `myquestbook.vercel.app` / `flashcards-ia.vercel.app` están
> libres. Los ejemplos de la documentación usan `flashcards-ia.vercel.app` y
> `flashcards-ia-api.onrender.com`: si el nombre que elegís ya existe, cambialo y actualizá en cadena
> `VITE_API_URL` (Vercel) → `FRONTEND_URL` (Render) → Google Console → Turnstile.

## Seguridad y rendimiento (ya implementado)

- **API**: `helmet`, CORS con allowlist (`FRONTEND_URL` + `CORS_ORIGINS`), body limit de 1 MB, 404 en
  JSON, rate limits por usuario/IP (auth 10/15 min, generación 5/h, evaluaciones 60/h), gzip, y
  `keepAliveTimeout`/`headersTimeout` en 120 s/125 s con cierre ordenado ante `SIGTERM`.
- **Uploads**: `multer` en memoria con límites estrictos (1 archivo, tamaño y cantidad de campos),
  validación de la firma `%PDF-` antes de parsear/subir/gastar IA, y compensación: si la generación
  falla se borra el PDF ya subido a Cloudinary.
- **Frontend**: vendor separado por `manualChunks` (react / motion / icons) para que el chunk de la
  app (~48 KB gzip) se invalide sólo cuando cambia código propio; `React.lazy` en estudio y paneles;
  cache inmutable de `/assets/*` en Vercel.
- **Datos**: ownership verificado en todos los use cases (`403` si el mazo no es del usuario),
  evaluación y progreso normalizados en el servidor, progreso de estudio con `upsert` debounced.

## Límites conocidos

- **Texto de un libro**: se usan hasta `PDF_MAX_TEXT_CHARS` caracteres por mazo (default 1.000.000;
  configurable hasta 4.000.000 ≈ 1M tokens). Los PDFs que ya no entran en ese presupuesto **no se parsean**
  (el texto se descartaba igual) y cada llamada a la IA recibe una ventana de
  `AI_DECK_PROMPT_CHARS_PER_CALL` caracteres (default 200.000 ≈ 50k tokens), con ventanas
  consecutivas entre tandas: así un documento grande no repite el prompt completo en cada llamada
  (menos latencia, menos tokens y menos 429 por TPM) y las tandas cubren partes distintas.
  Con documentos que entran en una sola llamada el comportamiento es el de siempre.
- **PDF grande en plan free**: `POST /decks/generate` mantiene el archivo en RAM (multer + copia del
  worker + subida a Cloudinary). En el plan free de Render (≈512 MB) un PDF de 100 MB puede dar
  OOM/502: bajá `MAX_PDF_UPLOAD_MB` (ej. 25) o pasá a un plan pago. Los PDFs de más de 7 MB no se
  archivan en Cloudinary (sólo se usa su texto) y ya no se leen a memoria para eso.
- **Cookies de terceros**: con frontend y backend en dominios distintos la cookie viaja con
  `SameSite=None; Secure`. En Safari/ITP o modo incógnito puede bloquearse; la solución robusta es un
  dominio propio (`app.tudominio.com` + `api.tudominio.com` → `SameSite=Lax`).
- **Plan free de Render**: el servicio se duerme tras ~15 min sin tráfico (la primera petición tarda
  ~30-60 s), puede reiniciarse y los rate limits en memoria se resetean con él.
- **`migrateEmailCi`**: la unicidad de email sin distinguir mayúsculas la garantiza la app (normaliza
  a minúsculas) más `users_email_key`; el índice `uq_users_email_ci` es opcional y no está aplicado.

## Troubleshooting rápido

| Síntoma | Causa probable | Solución |
| --- | --- | --- |
| Build de Render falla con `tsc: not found` | `NODE_ENV=production` + `npm install` (omite devDeps) | usar `npm ci --include=dev && npm run build` (ya está en `render.yaml`) |
| Build de Vercel falla pidiendo `VITE_API_URL` | falta la env var (guard en `vite.config.ts`) | definir **`/api/v1`** (con rewrite en `vercel.json`) o `https://<tu-api>/api/v1` |
| Login "funciona" pero al recargar vuelve al login | cookie `SameSite`/`Secure` o `FRONTEND_URL` distinto | `COOKIE_SAME_SITE=none` + HTTPS y `FRONTEND_URL` exacto, sin barra final |
| CORS bloqueado (también en previews de Vercel) | el origen no está en la allowlist | agregarlo a `CORS_ORIGINS` |
| 500 al subir PDF | credenciales de Cloudinary | revisar las 3 claves |
| 429/503 al generar o evaluar | cuota o saturación de Gemini | esperar el countdown de la UI o cargar `GEMINI_API_KEYS` / `GROQ_API_KEY` |
| Rutas 404 al recargar | falta el rewrite del SPA | ya incluido en `frontend/vercel.json` |

## Documentación

- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — runbook de despliegue, variables y errores frecuentes.
- [`docs/project-context.md`](docs/project-context.md) — arquitectura, contratos de la API y
  convenciones (fuente de verdad para cambios estructurales).
