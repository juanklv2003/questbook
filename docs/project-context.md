# Andel - Project Context

> **Note for AI Agents**: This document is the single source of truth for the architecture, tech stack, and conventions of the Andel project. Read it carefully before making any structural changes or implementations.

## 1. Project Overview
Andel is an AI-powered flashcard generation and study application. It allows users to upload PDF documents or text, automatically generates flashcards using AI, and provides a study interface that evaluates user answers using AI to give accurate feedback and scores.

## 2. Tech Stack

### Backend (`backend`)
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL (using `pg` driver)
- **AI Integration**: Google Generative AI (`@google/generative-ai`)
- **PDF parsing**: `pdf-parse` (extracción de texto real desde archivos PDF binarios)
- **Other tools**: `multer` for file uploads, `zod` for validation.

### Frontend (`frontend`)
- **Framework**: React 19 + Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4, `clsx`, `tailwind-merge`
- **Icons**: `lucide-react`
- **Animations**: `framer-motion`
- **HTTP Client**: `axios`

## 3. Architecture

### Backend: Screaming / Hexagonal Architecture
The backend is organized by feature modules, shouting what the application does. Inside each module, Hexagonal Architecture (Ports and Adapters) principles are applied.

**Directory Structure:**
```
backend/src/
├── core/             # Shared logic, middlewares, errors
├── config/           # Database and environment configs
└── modules/          # Feature modules (Screaming Architecture)
    ├── auth/         # Authentication and user management
    ├── decks/
    ├── flashcards/
    └── evaluations/
```

**Inside a Module (e.g., `decks/`):**
- `domain/`: Entities (`Deck.ts`) and Ports (`IDeckRepository.ts`, `IFlashcardGeneratorPort.ts`, `ICloudStoragePort.ts`). Contains NO external dependencies.
- `useCases/`: Application specific business rules (e.g., `GenerateDeckUseCase.ts`, `ListDecksUseCase.ts`, `DeleteDeckUseCase.ts`). Depends only on Domain.
- `infra/`: Adapters that implement Ports (e.g., `PostgresDeckRepository.ts`, `GeminiFlashcardGenerator.ts`, `CloudinaryStorageAdapter.ts`). Depends on external tools like `pg`, `@google/generative-ai`, or `cloudinary`.
- `http/`: Controllers and Routers (e.g., `DeckController.ts`, `DeckRouter.ts`). Express specific layer.

### Frontend: Atomic Design + Container/Presentational Pattern
The frontend uses a strict combination of Atomic Design for UI components and the Container/Presentational pattern for logic separation.

**Directory Structure:**
```
frontend/src/
├── components/
│   ├── atoms/        # Basic UI blocks (Button, Input)
│   ├── molecules/    # Combinations of atoms (Form fields)
│   ├── organisms/    # Complex UI sections (DeckUploader)
│   └── containers/   # Logic wrappers (DeckDashboardContainer, handles state/hooks)
├── hooks/            # Custom React hooks containing business logic and API calls
├── lib/              # Utility functions
└── types/            # Global TypeScript interfaces
```

**Rule**: Presentational components (`atoms`, `molecules`, `organisms`) should NOT contain data-fetching logic or heavy state. They should receive data and callbacks via props. Stateful logic and hook consumption happens in `containers`.

**Library / Dashboard UI (Andel):**
- `organisms/Navbar.tsx` — glassmorphism topbar rendered as a **floating pill**: `sticky top-3`, rounded-2xl, `bg-white/55 backdrop-blur-xl border-white/25` with drop+inset shadow. Logo left; "Perfil / Progreso / Ajustes" links, CTA "+ Nuevo Libro / Subir PDF", avatar and logout right. Labels collapse to icons below `sm`. Links are stubs (`onNavigate` defaults to no-op; no screens exist yet).
- Topbar CTA wiring: `App.tsx` bumps `createSignal` (passed to `DeckDashboardContainer`, which already opens `CreateDeckDrawer` when it changes). From a study session the CTA navigates to the library first and defers the increment one frame (`window.setTimeout(..., 0)`) so the freshly-mounted dashboard baseline ref doesn't absorb the signal.
- `organisms/CreateDeckDrawer.tsx` renders through a **React portal** (`createPortal(..., document.body)`): the modal used to be trapped inside the dashboard's `relative z-10` wrapper (which creates a stacking context), so the sticky navbar (`z-40`) painted over it and the modal appeared "below the top menu". With the portal the drawer escapes that context and covers the viewport, navbar included.
- Background: fully CSS-generated (NO photos). `MysticForestBackground` renders pure gradients (deep forest green base, moonlit glow top-center, mist band, light shaft and vignette). The `biblioteca.jpg` / `ramas.png` / `alfombra.png` / `hero.png` photo assets were **deleted** from the repo — nothing image-based remains in the UI.
- Dashboard: single-viewport layout centered on screen. No hero — the bookshelf starts right under the navbar. Removed the old "Mi Biblioteca" hero panel, stat chips (`HeroStat`) and `shelfTitles` category plates. The app shell is `flex h-screen flex-col` (App.tsx), the dashboard root is `flex-1 flex flex-col justify-center`, and the container is `mx-auto max-w-6xl` — so the bookshelf is centered both vertically and horizontally. Shelf containers are `h-[min(180px,calc((100vh-170px)/3))]` (180px on tall screens, auto-shrinks on short ones so it never overflows) + inter-shelf boards `h-3`. **Page scroll is disabled entirely**: `html, body { overflow: hidden; height: 100% }` and `<main>` uses `overflow-clip`. The template footer was removed.
- `molecules/Bookshelf.tsx` — wooden furniture only (no category plates after user removal). Shelf containers are `h-[min(180px,calc((100vh-170px)/3))]` (fixed 180px on tall screens, shrinks on short ones to prevent overflow) + inter-shelf boards `h-3`. Dashboard default: no titles on baldas (removed per user request).
- `molecules/BookCard.tsx` — **original clean look restored** (per user feedback "ponlos como estaban, eran feos"): solid-color spines, NO gradient overlay, NO gold tooling, NO raised bands. `h-28..h-44 × w-7..w-14` vertical spines (`text-[10px]` semibold vertical title), `h-8` horizontal variant (`text-[10px]`). Only addition kept from the brief: subtle `progressPercent` bar (3px vertical / 2px horizontal, white/35) at the spine base + HoverCard secondary "N flashcards · X% completo".
- `Deck.progressPercent` (frontend type) is **real persisted data**: `decks.studied_count` / `decks.correct_count` accumulate on every successful evaluation (`recordEvaluation`, atomic UPDATE); `progressPercent = round(100*correct/studied)`, null while studied = 0. `GET /decks` includes it; the dashboard passes it as-is (`?? null`, honest "sin datos").

## 4. Database Schema
The system uses PostgreSQL.

### Table: `users`
- `id` (UUID, Primary Key)
- `email` (VARCHAR(255)) — identity is case-insensitive: the app normalizes every email with trim + lowercase before validation/storage, lookups match with `LOWER(email)`, and uniqueness is enforced by `UNIQUE (LOWER(email))` (`uq_users_email_ci`; applied via `backend/src/scripts/migrateEmailCi.ts`, which aborts with a report when legacy collisions exist)
- `password_hash` (VARCHAR(255))
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

### Table: `decks`
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key to `users.id`)
- `name` (Text)
- `folder_id` (UUID, Optional/Nullable)
- `shelf_index` (INT, default 0), `position` (INT, default 0)
- `studied_count` (INT, default 0), `correct_count` (INT, default 0) — cumulative study progress; `progressPercent = round(100*correct/studied)`, null when studied = 0
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

### Table: `flashcards`
- `id` (UUID, Primary Key)
- `deck_id` (UUID, Foreign Key to `decks.id`)
- `question` (Text)
- `answer` (Text)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

### Table: `study_sessions`
- `user_id` (UUID, FK to `users.id` ON DELETE CASCADE) + `deck_id` (UUID, FK to `decks.id` ON DELETE CASCADE) — composite PK `(user_id, deck_id)`
- `current_index` (INT, default 0)
- `results` (JSONB, default `'{}'` — `{flashcardId: bool}`)
- `flashcards_hash` (TEXT, nullable — detects regenerated decks; stale hashes are ignored, never auto-deleted)
- `finished` (BOOLEAN, default false — finishing never deletes the row)
- `created_at` / `updated_at` (Timestamp)
- Rule: NO TTL, NO auto-clear on finish. Only an explicit `DELETE /decks/:id/session` removes the row. Decks themselves are only deleted via explicit `DELETE /decks/:id` (modal).

*(Note: Schema migrations are handled manually or through an external script not tracked in `.sql` files within the repo currently. Use the Repository pattern `infra` classes as the source of truth for queries).*

## 5. API Endpoints

The API is served at `/api/v1`.

### Authentication (`/api/v1/auth`)
- `POST /register`: Registers a new user. Expects JSON `{ email, password }`. Returns `{ user, token }` and sets an HttpOnly cookie with the JWT.
- `POST /login`: Logs in an existing user. Expects JSON `{ email, password, rememberMe }`. Returns `{ id, email }` and sets an HttpOnly cookie with the JWT.
- `POST /logout`: Logs out the current user by clearing the HttpOnly cookie.
- `GET /me`: Returns the current user's info based on the HttpOnly cookie.
- Cookie `auth_token` (`backend/src/modules/auth/http/AuthController.ts`): `HttpOnly`, `path=/`, `maxAge` alineado con la expiración del JWT (registro 7d, login 30d con `rememberMe` / 1d sin él), `secure` sólo con `NODE_ENV=production` y `sameSite` desde `COOKIE_SAME_SITE`. Default de esa variable: `none` en producción (frontend y backend en dominios distintos, ej. Vercel + Render — `strict`/`lax` harían que el login "funcione" pero `/me` devuelva 401 al recargar) y `lax` en desarrollo. Con subdominios del mismo dominio alcanza `lax`. `FRONTEND_URL` se normaliza (trim + sin barra final) para que CORS no falle por tipeo. Detalle de despliegue en [`DEPLOYMENT.md`](./DEPLOYMENT.md).
- Validation contract (controller-level zod via `parseBody`): any invalid body or route param returns `400 { error: string }` describing **only the first issue** as `"<path>: <message>"` (one problem per round trip); syntactically malformed JSON is also `400 { error }` via the `errorHandler` SyntaxError branch (it never reaches `parseBody`). Emails are trimmed + lowercased before format check on register and login. Passwords: register requires length ≥ 8, login requires non-empty. Re-registering an existing email — including a case variant (`User@x` vs `user@x`) — returns `409`.

### Decks (`/api/v1/decks`)
- Guard order: every protected deck route checks authentication **before** validating params/body — unauthenticated callers get `401` even when the id or body is also malformed. Every `:id` / `:deckId` is validated as UUID (`400 { error }` when malformed).
- `GET /`: Lists all decks, ordered by creation date descending. Returns an array of decks including a computed `flashcardsCount` and persisted `progressPercent` (null = no evaluations yet).
- `POST /generate`: Uploads a PDF or text to generate a new deck. Expects `multipart/form-data` with `file` (optional) and `name` (required). If a `file` is provided, its text is extracted with `pdf-parse` (`PdfTextExtractor`) before being sent to Gemini AI to extract flashcards. To keep requests responsive, the text is truncated to the first 40,000 characters and the AI is limited to 15 flashcards per deck; the Gemini call has a 60s timeout. Returns the new deck info.
- `GET /:deckId/flashcards`: Retrieves all flashcards associated with a specific `deckId`.
- `DELETE /:id`: Deletes a specific deck. Uses DB cascades to remove associated flashcards and removes the source file from Cloudinary (via `ICloudStoragePort`).
- `GET /:id/session`: Returns the resumable study session `{ session: { userId, deckId, currentIndex, results, flashcardsHash, finished, createdAt, updatedAt } }`. 404 = deck not found OR no session yet. 403 = not the owner.
- `PATCH /:id/session`: Upserts study progress. Body `{ currentIndex: int>=0, results: {id: bool}, flashcardsHash?: string|null, finished?: bool }` — also accepts the `flashcards_hash` snake_case alias; unknown keys are ignored. Finishing (`finished: true`) preserves the row for review. 403/404 on ownership.- `DELETE /:id/session`: Explicit user action only — deletes the session row (204, idempotent). The ONLY way progress is removed.

### Evaluations (`/api/v1/evaluations`)
- `POST /evaluate`: Evaluates a user's answer against a flashcard. Expects JSON `{ flashcardId, userAnswer }`. Uses Gemini AI to determine correctness, then atomically accumulates the result on the owning deck (`studied_count`+1, `correct_count`+0/1). Returns `{ isCorrect, score, feedback, deckId, deckProgress }`.

## 6. App AI & UX Guidelines

### AI Prompt Constraints (Gemini)
- **Strict Spanish Output**: All generated flashcards, feedback, and AI interactions MUST be strictly in Spanish.
- **Zero Hallucination Policy (0%)**: The AI must extract information strictly from the provided context (e.g., uploaded PDFs) and must not invent or hallucinate outside information.

### UX/UI Principles
- **Split-Screen Layout**: The frontend uses a split-screen layout for optimal study focus, dividing the screen between the deck management/listing and the active flashcard interaction area.
- **Keyboard Navigation**: Support keyboard interactions across the app, specifically allowing users to submit inputs and forms by pressing `Enter`.
- **Clear Interactive Cursors**: All clickable or interactive elements must use standard cursor pointers (e.g., `cursor-pointer`) to clearly indicate interactivity.

## 7. AI Agent Instructions
- **Do not bypass the Architecture**: If you add a feature, create the Domain Port, implement the Infra Adapter, build the UseCase, and wire it in the HTTP Controller.
- **Frontend State**: Keep API calls inside `hooks/` and consume them in `containers/`. Do not fetch data inside `organisms/`.
- **Shared deck store contract** (`DeckProvider` in `frontend/src/contexts/`, single access path via `frontend/src/hooks/useDecks.ts` — never import the raw context elsewhere): `GET /decks` fires exactly once per authenticated session (in-flight-guarded, so StrictMode double-effects collapse) and every consumer renders from that cache; unauthenticated sessions fetch nothing. `refetch()` is the only explicit refresh (study-exit guard calls it once on the deck-id null-transition). Logout clears the cache synchronously (`setDecks([])`) so the next account never sees the previous one, and the next login re-fetches.
- **Imports**: Avoid barrel files outside of their direct folder scopes. Use explicit paths when crossing boundaries.
- **STRICT DOCUMENTATION RULE**: ANY future updates, new endpoints, or architectural changes MUST be documented in this `project-context.md` file immediately so it never goes out of sync. This file is the absolute source of truth.
