# Design: P1 Validation + Shared Deck Store

## Technical Approach

Harden the drafted 7-item tree in place: controller-level zod via `parseBody` (first-issue → 400 `{ error }`), uniform 401-before-400 guards, case-insensitive email with functional unique index, single-statement CTE create, zero-dependency fetch-once `DeckContext`. Wiring untouched; no new dependencies.

## Architecture Decisions

### D1 — Validation failure shape

| Option | Tradeoff | Decision |
|---|---|---|
| First-issue (`issues[0]` → `"<path>: <message>"`) | One problem per round trip; fits `{ error: string }` | **Accepted** — reuse for UUID params |
| Full issue list | Breaks contract in `AuthContext`, `useDecks`, interceptors | Rejected (out of scope) |

### D2 — Email identity

| Option | Tradeoff | Decision |
|---|---|---|
| zod pipe (`trim().toLowerCase().pipe(z.email())`) + `LOWER()` lookup + `UNIQUE (LOWER(email))` | One choke point; legacy mixed-case logins work; closes `User@x`/`user@x` 409 bypass | **Accepted** |
| `CITEXT` column | Type migration + adapter churn | Rejected |
| Normalize in use cases | Rule split across use cases, controllers unguarded | Rejected |

### D3 — 401-before-400 order

| Option | Tradeoff | Decision |
|---|---|---|
| Auth check first in every protected handler | Uniform 401 for anonymous callers; matches `getSession`/`saveSession` | **Accepted** — reorder `getFlashcards` + `deleteDeck` |
| Validate first | Leaks route shape to anonymous callers; per-route inconsistency | Rejected |

### D4 — Atomic deck create

| Option | Tradeoff | Decision |
|---|---|---|
| Single-statement CTE (`WITH shifted AS (UPDATE …) INSERT …`) | One implicit transaction + one Neon round trip; failed INSERT rolls back shift | **Accepted** — keep as drafted |
| Explicit `BEGIN/COMMIT` | Two serverless round trips | Rejected |

### D5 — Shared deck store

| Option | Tradeoff | Decision |
|---|---|---|
| `DeckProvider` + `useCallback` + in-flight ref + clear-on-logout | Zero deps; one `GET /decks` per session; request-level StrictMode dedup | **Accepted** |
| React Query / SWR | Retry/SWR for free but new dep + rewrite | Rejected (deferred) |

### D6 — Single access path

| Option | Tradeoff | Decision |
|---|---|---|
| `useDecks` re-exports `refetch`; `App.tsx` uses it only | One accessor per `hooks/` rule | **Accepted** |

## Data Flow

```
POST /auth/* → parseBody(schema) ──400 {error}, first issue only
            └─ valid (email normalized) → UseCase → PostgresUserRepository
                                          LOWER() lookup │ 23505 → 409

Protected deck route → requireAuth → 401 if !req.user → parseBody(deckIdSchema) → 400
                     → UseCase → Repo (CTE create / session upsert) → 200/204

Auth=true → DeckProvider effect → GET /decks once (in-flight-guarded) → shared cache
  ├── study-exit (prevDeckId null-transition) → refetch() ×1
  └── logout → setDecks([]) immediately → next login re-fetches
```

## File Changes

| File | Action | Description |
|---|---|---|
| `backend/src/scripts/migrateEmailCi.ts` | Create | Collision pre-check + `UNIQUE (LOWER(email))` index |
| `backend/src/modules/decks/http/DeckController.ts` | Modify | 401-before-UUID-parse in `getFlashcards`, `deleteDeck` |
| `frontend/src/contexts/DeckContext.tsx` | Modify | `useCallback` fetch, in-flight ref, clear-on-logout |
| `frontend/src/hooks/useDecks.ts` | Modify | Re-export `refetch` |
| `frontend/src/App.tsx` | Modify | Use `useDecks` instead of `useDeckContext` |
| `docs/project-context.md` | Modify | 400 shapes, normalization, guard order, store contract |
| `parseBody.ts`, auth schemas, session schema, CTE create, `LOWER()` lookup, `main.tsx`, prevDeckId guard | Verify-only | Draft in tree; covered by builds + curl |

## Interfaces / Contracts

```ts
// sessionBodySchema: snake_case alias; unknown keys stripped (safe: sender covers keys)
currentIndex: z.number().int().min(0),
results: z.record(z.string(), z.boolean()),
flashcardsHash / flashcards_hash: z.string().nullable().optional(),
finished: z.boolean().optional(),
```

```sql
-- migrateEmailCi.ts: abort-with-report on collisions, else enforce
SELECT LOWER(email), COUNT(*) FROM users GROUP BY 1 HAVING COUNT(*) > 1;
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_ci ON users (LOWER(email));
```

Provider value unchanged: `{ decks, isLoading, error, setDecks, refetch }`.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Build | Both sides compile (no runner) | `npm run build --prefix backend/frontend` |
| curl auth | Bad register → 400 first-issue; 7-char pw → 400; `USER@x` login → 200; case-variant re-register → 409 | Manual curl, assert `{ error: string }` |
| curl decks | Unauth bad UUID → 401, authed → 400; PATCH snake_case → 200, `currentIndex: -1` → 400 | Manual curl |
| Frontend | One `GET /decks` per session; study-exit refetch ×1; logout clears, no flash | Network tab, StrictMode on |

## Threat Matrix

N/A — no shell/subprocess, VCS/PR automation, executable classification, or process-integration boundary. The guard reorder is application auth logic; no RED tests required.

## Migration / Rollout

Code first (`LOWER()` lookup is backward-compatible), then `migrateEmailCi.ts`; on collisions abort, resolve manually (keep oldest). Keep `idx_users_email`. Limitation: concurrent creates can share `position: 0` — accepted.

## Open Questions

- None blocking. `{ user }` vs `{ id, email }` drift stays record-only (out of scope).
