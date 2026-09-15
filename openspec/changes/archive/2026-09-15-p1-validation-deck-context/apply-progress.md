# Apply Progress: p1-validation-deck-context — Work Units 1–2 (cumulative)

**Change**: p1-validation-deck-context
**Work unit**: 1 — Backend validation + email-CI migration (PR 1 slice) + 2 — Deck store polish + single access path (PR 2 slice)
**Mode**: Standard (strict_tdd false, no test runner — per `openspec/config.yaml`)
**Chain strategy**: stacked-to-main (resolved via guard: user chose chained PRs)
**Scope limit**: WU1 (tasks 1.1–1.5, 2.1–2.2, 3.1–3.3) DONE + WU2 (tasks 1.6, 2.3, 2.4, 3.4) DONE. WU3 (4.1 docs + WARNING-1 fix) untouched, stays for later.

## Result

All 10 WU1 tasks verified complete. **Zero repo lines authored by this batch**: every WU1
artifact was already present in the drafted working tree (uncommitted) and matches specs +
design (D1–D4) exactly, so this batch contributed verification evidence, not code edits.
`git status` after all builds/curl runs is identical to the pre-batch tree.

## Completed Tasks (with evidence)

- [x] **1.1** `parseBody.ts` — `safeParse` failure throws `AppError(400, "<path>: <message>"`
  of `issues[0]` only; `errorHandler` maps `AppError` → `{ error }`. Live proof:
  `POST /auth/register {"email":"not-an-email","password":"short"}` →
  `400 {"error":"email: Email inválido"}` (first issue only, password also invalid).
- [x] **1.2** Auth schemas — `emailSchema = z.string().trim().toLowerCase().pipe(z.email())`;
  register `password` min 8, login `password` min 1. Live: 7-char pw → `400 password: …8 caracteres`;
  empty login pw → `400 password: La contraseña es obligatoria`.
- [x] **1.3** `deckIdSchema = z.uuid()` + `sessionBodySchema` (`currentIndex int ≥ 0`,
  `results` record, `flashcardsHash`/`flashcards_hash` aliases, optional `finished`, unknown
  keys stripped by zod default). Live: `currentIndex: -1` → `400 currentIndex: Too small…`;
  `flashcards_hash: "abc123"` on a real deck → `200` persisted as `flashcardsHash: "abc123"`.
- [x] **1.4** CTE atomic create — single `this.db.query` with `WITH shifted AS (UPDATE …)
  INSERT …` (failed INSERT rolls back the position shift). Code inspection; no fault-injection
  harness available in this repo.
- [x] **1.5** `LOWER()` lookup — `WHERE LOWER(email) = LOWER(${email})` in
  `PostgresUserRepository.findByEmail`. Live: register lowercase → login `"  UPPER  "` → `200`.
- [x] **2.1** `backend/src/scripts/migrateEmailCi.ts` present (76 lines, untracked-drafted):
  collision pre-check (`GROUP BY LOWER(email) HAVING COUNT(*) > 1`) abort-with-report
  (`process.exit(1)` + per-group `id/email/created_at` listing), then
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_ci ON users (LOWER(email))`,
  plus `--down` rollback (`DROP INDEX IF EXISTS uq_users_email_ci`, keeps `idx_users_email`).
  Script NOT executed (rollout decision stays with maintainer). Read-only pre-check run:
  **0 collisions across 7 users** → safe to apply when scheduled.
- [x] **2.2** 401-before-UUID — already satisfied in the drafted tree: `getFlashcards` and
  `deleteDeck` check `req.user?.userId` → `401` before `parseBody(deckIdSchema, …)`
  (all other protected handlers share the order; routes are additionally double-guarded by
  mount-level + route-level `requireAuth`). Live: unauth `GET /decks/not-a-uuid/flashcards`
  → `401` (not 400); authed → `400 {"error":"ID de libro inválido"}` (GET + DELETE).
- [x] **3.1** `npm run build --prefix backend` → exit 0 (`tsc`, strict). `npm run build
  --prefix frontend` → exit 0 (`tsc -b && vite build`, 2239 modules; pre-existing
  chunk-size warning only). No type errors on either side.
- [x] **3.2** Auth curl matrix (local API :3000, one disposable test user, fully cleaned up
  afterwards): bad register → 400 first-issue; 7-char pw → 400; `USER@x`+spaces login → 200;
  case-variant re-register → `409 {"error":"User already exists"}`.
- [x] **3.3** Decks curl matrix: unauth bad UUID → 401; authed bad UUID → 400 (GET + DELETE);
  snake_case PATCH on real deck → 200 with alias persisted; `currentIndex: -1` → 400.

## Files Changed (this batch authored none — all verified-as-drafted)

| File | Action | What Was Done |
|------|--------|---------------|
| `backend/src/core/validation/parseBody.ts` | Verified (drafted, untracked) | First-issue → `AppError(400)`; matches D1 |
| `backend/src/modules/auth/http/AuthController.ts` | Verified (drafted, modified) | Email normalize + pw rules; matches D2 |
| `backend/src/modules/decks/http/DeckController.ts` | Verified (drafted, modified) | UUID + session schemas, 401-first; matches D1/D3 |
| `backend/src/modules/decks/infra/PostgresDeckRepository.ts` | Verified (drafted, modified) | Single-statement CTE create; matches D4 |
| `backend/src/modules/auth/infra/PostgresUserRepository.ts` | Verified (drafted, modified) | `LOWER()` lookup; matches D2 |
| `backend/src/scripts/migrateEmailCi.ts` | Verified (drafted, untracked) | Pre-check + functional unique index + `--down`; matches design migration |
| `openspec/changes/p1-validation-deck-context/tasks.md` | Modified | Marked 1.1–1.5, 2.1–2.2, 3.1–3.3 `[x]` |
| `openspec/changes/p1-validation-deck-context/apply-progress.md` | Created | This file (WU1 evidence) |

## Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npm run build --prefix backend` → exit 0, no errors (tsc strict). `npm run build --prefix frontend` → exit 0 (tsc -b + vite, 2239 modules, chunk-size warning only). No test runner exists (strict_tdd false), so builds are the focused gate per `openspec/config.yaml`. |
| Runtime harness command/scenario and exact result | Manual curl matrix vs local API :3000 (10 scenarios, all match spec): bad-register 400 first-issue; 7-char-pw 400; empty-login-pw 400; UPPER+spaces login 200; case-variant re-register 409; unauth bad-UUID 401; authed bad-UUID 400 (GET+DELETE); snake_case PATCH 200 with `flashcardsHash:"abc123"` persisted; `currentIndex:-1` 400; snake_case on missing deck 404 (validation passed). Disposable user `wu1verify.*@example.com` created then deleted (cascade); users 7→8→7, 0 collisions. |
| Rollback boundary | Revert drafted backend files (`AuthController.ts`, `PostgresUserRepository.ts`, `DeckController.ts`, `PostgresDeckRepository.ts`); delete untracked `backend/src/core/validation/parseBody.ts` + `backend/src/scripts/migrateEmailCi.ts`. Migration never executed → `DROP INDEX uq_users_email_ci` not needed (script ships its own `--down`). No frontend changes in this unit; DB left identical to pre-batch state. |

## Deviations from Design

None — implementation matches design (D1 first-issue shape, D2 email identity, D3 401-before-400,
D4 CTE create, migration SQL verbatim). Task 2.2 required no edit: the drafted tree already
ordered auth-before-parse in `getFlashcards`/`deleteDeck`.

## Issues Found

1. **Syntactically-malformed JSON bodies return 500 in dev** (e.g. `{"error":"Unterminated string
   in JSON…"}` with HTTP 500; would be a masked 500 in production). Spec Requirement 1 says
   "invalid JSON body" MUST yield 400 `{ error }` — the zod/`parseBody` path covers
   semantically-invalid bodies, but Express `express.json()` syntax errors bypass it via the
   `errorHandler` fallback. Fix (add a `SyntaxError`/body-parser branch in `errorHandler.ts`)
   is backend-only and small, but `errorHandler.ts` is outside the WU1 file list, so it is
   **flagged for orchestrator triage** (WU1 follow-up or WU3), not silently fixed here.
2. Harness note: PowerShell `curl.exe -d` with spaced values word-splits; all spaced-payload
   probes were re-run via `--data @file` (results above are from the file-based runs).

## Remaining Tasks (out of scope for these units)

- [ ] 4.1 — WU3 (docs sync, PR 3) + WARNING-1 malformed-JSON 500 triage (verify-report; stays for later per scope limit)

## Workload / PR Boundary

- Mode: chained PR slice (stacked-to-main, PR 1 of 3)
- Current work unit: WU1 — backend validation + email-CI migration
- Boundary: starts at drafted validation tree, ends with builds green + curl matrix green +
  migration script created-but-unapplied
- Estimated review budget impact: drafted WU1 diff ≈ 230 lines (4 modified backend files +
  `parseBody.ts` 19 lines + `migrateEmailCi.ts` 76 lines), comfortably under the 400-line
  budget; this batch authored 0 additional lines (tasks.md checkboxes + this progress file only)

---

# Work Unit 2 — Deck store polish + single access path (PR 2 slice)

## Result

All 4 WU2 tasks complete (1.6, 2.3, 2.4, 3.4). Baseline: the drafted tree already
mounted `DeckProvider` inside `AuthProvider` (`main.tsx`), added the study-exit
refetch guard (`App.tsx` via `useDeckContext`), and converted `useDecks` from a
per-instance fetcher into a context delegate — but the delegate dropped `refetch`,
`fetchDecks` was a plain (unstable) closure with no in-flight guard, and logout
never cleared the cache. This batch hardened the store to the D5/D6 contract with
focused edits; no backend files touched.

## Completed Tasks (with evidence)

- [x] **1.6** Mount + guard verified: `main.tsx` nests
  `LanguageProvider > AuthProvider > DeckProvider > App` (StrictMode on) — no edit
  needed. `App.tsx` study-exit guard verified (`prevDeckId` ref, `wasInStudy`
  null-transition, `void refetchDecks()` on `[activeDeckId, refetchDecks]`) and
  switched to the single access path (see 2.4).
- [x] **2.3** `frontend/src/contexts/DeckContext.tsx` polished to D5:
  `fetchDecks` is now `useCallback([isAuthenticated])` (stable identity, so the
  App guard effect does not re-fire per render); `inFlightRef` collapses
  StrictMode double-effect + repeated study-exit triggers into one in-flight
  `GET /decks`; `authRef` (synced in an effect, never during render) drops late
  responses after logout; the effect clears `setDecks([]) + setError(null) +
  setIsLoading(false)` synchronously on `isAuthenticated → false` (spec Logout
  Clear; one intentional extra render, documented with a targeted
  `eslint-disable-next-line react-hooks/set-state-in-effect` — repo precedent:
  `useThemeSettings.ts` carries a targeted disable too). `deck-context.ts`:
  `refetch` type tightened `() => void` → `() => Promise<void>` to match the
  implementation, plus English comments per artifact language contract.
- [x] **2.4** `frontend/src/hooks/useDecks.ts` re-exports `refetch`
  (`{ decks, isLoading, error, setDecks, refetch }`); `App.tsx` now imports
  `useDecks` only — the `useDeckContext` import is removed. Grep proof:
  `useDeckContext` remains referenced only in `deck-context.ts` (definition)
  and `useDecks.ts` (single delegation point). Single access path per `hooks/`
  rule (D6) holds: `DeckDashboardContainer`, `GlobalPanels`, and the App guard
  all consume the same cached list.
- [x] **3.4** Frontend checks (static-trace + build; no runner per config):
  exactly ONE list-fetch call site exists (`apiClient.get('/decks')` in
  `DeckContext.tsx:49`; all other `/decks/*` hits are per-deck operations —
  generate/flashcards/shelf/session/delete). Fetch-once: effect deps
  `[isAuthenticated, fetchDecks]` + stable callback + in-flight guard ⇒ one
  `GET /decks` per session, shared by all consumers; unauthenticated sessions
  early-return without fetching. Study-exit: null-transition guard + stable
  refetch + in-flight guard ⇒ refetch ×1 per exit, repeated triggers in one
  frame collapse. Logout: synchronous clear + `authRef` late-response drop ⇒
  empty list, no cross-account flash; next login re-fetches via the effect.
  Live Network-tab confirmation (one GET per session observed in devtools) is
  NOT claimed here — no authenticated browser session exists in this
  environment — and is deferred to PR2 review / sdd-verify WU2 harness.

## Files Changed (WU2 batch)

| File | Action | What Was Done |
|------|--------|---------------|
| `frontend/src/contexts/DeckContext.tsx` | Modified (drafted, untracked) | `useCallback` fetch, `inFlightRef` + `authRef` guards, clear-on-logout; matches D5 |
| `frontend/src/contexts/deck-context.ts` | Modified (drafted, untracked) | `refetch: () => Promise<void>` type + English comments |
| `frontend/src/hooks/useDecks.ts` | Modified | Re-export `refetch`; single delegation point; matches D6 |
| `frontend/src/App.tsx` | Modified | Study-exit guard consumes `useDecks` only; `useDeckContext` import removed; English comments |
| `frontend/src/main.tsx` | Verified (drafted, no edit) | `DeckProvider` inside `AuthProvider`; matches data-flow diagram |
| `openspec/changes/p1-validation-deck-context/tasks.md` | Modified | Marked 1.6, 2.3, 2.4, 3.4 `[x]` |
| `openspec/changes/p1-validation-deck-context/apply-progress.md` | Modified | Merged: WU1 evidence preserved verbatim, WU2 appended |

## Work Unit Evidence (WU2)

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npm run build --prefix frontend` → BUILD_EXIT_0 (`tsc -b && vite build`, 2239 modules; pre-existing chunk-size warning only). `npx eslint src/contexts/DeckContext.tsx src/contexts/deck-context.ts src/hooks/useDecks.ts src/App.tsx` → LINT_EXIT_0 (2 initial findings fixed: render-time ref write → effect sync; sync logout clear → documented targeted disable). No test runner exists (strict_tdd false), so build + lint are the focused gate per `openspec/config.yaml`. |
| Runtime harness command/scenario and exact result | Static-trace harness (no authenticated browser session in this environment): single `GET /decks` call site proven by grep (1 list-fetch site; per-deck ops excluded); StrictMode dedup traced via `inFlightRef`; logout-clear + no-flash traced via synchronous clear + `authRef` drop; study-exit ×1 traced via null-transition + stable refetch + in-flight collapse. Live Network-tab pass (one GET per session, study-exit ×1, logout clear observed) explicitly deferred to PR2 review / sdd-verify — NOT claimed as done. |
| Rollback boundary | Revert `frontend/src/contexts/` (delete untracked `DeckContext.tsx`, `deck-context.ts`), `frontend/src/hooks/useDecks.ts`, `frontend/src/App.tsx`, `frontend/src/main.tsx`. No backend changes in this unit; nothing else touched. |

## Deviations from Design

None — implementation follows D5 (`useCallback` + in-flight ref + clear-on-logout,
zero deps) and D6 (`useDecks` re-exports `refetch`; `App.tsx` uses it only).
Provider value shape unchanged (`{ decks, isLoading, error, setDecks, refetch }`;
only the `refetch` return type was tightened to `Promise<void>`). One judgment
call: `authRef` added beyond the literal file-change list to close a real
race (late list response repopulating the cache after logout) — within D5's
"no cross-account flash" intent.

## Issues Found (WU2)

1. `useFlashcardStudy.ts` comments (lines ~131, ~345) still say the "dashboard
   re-fetches GET /decks on mount" — stale w.r.t. the shared store (dashboard
   now reads cache). Out of WU2 file scope; flagged for WU3 docs pass or a
   fast follow-up, not silently edited here.
2. Lint `react-hooks/set-state-in-effect` fires on the spec-mandated synchronous
   logout clear; resolved with a documented targeted disable (no behavior change).

## Workload / PR Boundary (WU2)

- Mode: chained PR slice (stacked-to-main, PR 2 of 3)
- Current work unit: WU2 — deck store polish + single access path
- Boundary: starts at drafted provider mount + guard-via-`useDeckContext`, ends with hardened store + `useDecks`-only access + build/lint green
- Estimated review budget impact: PR2 slice ≈ 120–150 lines (untracked `DeckContext.tsx` 81–84 lines + `deck-context.ts` ~23 + `useDecks.ts` rewrite net −19/+11 + `App.tsx` +13 vs HEAD + `main.tsx` +4 vs HEAD), well under the 400-line budget
- Dependency diagram: `main` ← 📍 PR2 (this slice: `contexts/`, `hooks/useDecks.ts`, `App.tsx`, `main.tsx`) ← PR3 (docs + WARNING-1, pending). PR1 (backend validation) is the stacked parent.

## Cumulative Status

14/15 tasks complete (WU1 10/10 + WU2 4/4). Remaining: 4.1 docs sync (WU3) + WARNING-1 triage. Ready for sdd-verify WU2 slice, then WU3.

---

# Work Unit 3 — Docs sync + WARNING-1 fix (PR 3 slice, final batch)

## Result

All WU3 work complete (4.1 `[x]` + WARNING-1 fixed + WU2 stale-comment note
resolved). This batch authored a minimal focused diff: 16 insertions, 6
deletions across 3 files — well under the 400-line budget. No store or
backend-validation logic touched.

## Completed Tasks (with evidence)

- [x] **4.1** `docs/project-context.md` synced per its strict documentation
  rule (English, matching file language; 5+/−3 lines):
  - §4 `users.email`: case-insensitive identity — trim+lowercase normalize,
    `LOWER()` lookup, `UNIQUE (LOWER(email))` (`uq_users_email_ci` via
    `migrateEmailCi.ts` with abort-with-report on collisions).
  - §5 auth: 400 first-issue `{ error }` `"<path>: <message>"` contract,
    malformed-JSON → 400 via `errorHandler` SyntaxError branch, email
    trim+lowercase, password rules (register ≥ 8, login non-empty),
    case-variant re-register → 409.
  - §5 decks: 401-before-400 guard order, UUID params → 400, session PATCH
    `flashcards_hash` alias + unknown-keys-ignored.
  - §7: shared deck store contract — fetch-once per session
    (in-flight-guarded), unauthenticated fetches nothing, `refetch()` as the
    only explicit refresh (study-exit null-transition), synchronous logout
    clear, single access path via `useDecks`.
- [x] **WARNING-1 fixed** `backend/src/core/middlewares/errorHandler.ts`
  (+8 lines): `SyntaxError` with a `body` property (thrown by
  `express.json()` before controllers run, so `parseBody` never sees it) now
  returns `400 { error: "Invalid JSON body." }` instead of falling through
  to the 500 fallback. AppError contract and prod masking untouched.
  Live before/after on local API :3000:
  `POST /auth/register {"email": "unterminated` → **500** pre-fix,
  → `400 {"error":"Invalid JSON body."}` post-fix (server restarted from
  fresh `dist` to pick up the change).
- [x] **WU2 stale-comment note resolved** (was trivial, fixed in place):
  `frontend/src/hooks/useFlashcardStudy.ts` lines ~130, ~345 no longer claim
  the dashboard "re-fetches GET /decks on mount" — both comments now say the
  shared store refreshes via study-exit refetch (3+/−3 lines, comments only).

## Files Changed (WU3 batch)

| File | Action | What Was Done |
|------|--------|---------------|
| `docs/project-context.md` | Modified | 400 shapes, email normalization, 401-before-400, session alias, store contract |
| `backend/src/core/middlewares/errorHandler.ts` | Modified | SyntaxError-from-`express.json` → `AppError`-shaped 400 `{ error }` |
| `frontend/src/hooks/useFlashcardStudy.ts` | Modified | 2 stale comments corrected to the shared-store contract |
| `openspec/changes/p1-validation-deck-context/tasks.md` | Modified | Marked 4.1 `[x]` (15/15 complete) |
| `openspec/changes/p1-validation-deck-context/apply-progress.md` | Modified | Merged: WU1 + WU2 evidence preserved verbatim, WU3 appended |

## Work Unit Evidence (WU3)

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npm run build --prefix backend` → BUILD_EXIT_0 (`tsc`, strict). `npm run build --prefix frontend` → BUILD_EXIT_0 (`tsc -b && vite build`; pre-existing chunk-size warning only). No test runner exists (strict_tdd false), so builds are the focused gate per `openspec/config.yaml`. |
| Runtime harness command/scenario and exact result | Live curl vs local API :3000 (file-based `--data @file` bodies): malformed JSON → `400 {"error":"Invalid JSON body."}` (was 500 pre-fix — WARNING-1 closed); bad register → `400 {"error":"email: Email inválido"}` (first-issue, no regression); unauth `GET /decks/not-a-uuid/flashcards` → `401` (no regression). Backend server restarted from rebuilt `dist` (old PID 8280 stopped, fresh PID 10556 listening) so the fix is the live code. |
| Rollback boundary | Revert `docs/project-context.md` + `backend/src/core/middlewares/errorHandler.ts` + `frontend/src/hooks/useFlashcardStudy.ts` (comment-only) only. No store/backend-validation changes in this unit. |

## Deviations from Design

None — WARNING-1 fix is the exact branch the WU1 report flagged
(`SyntaxError`/body-parser branch in `errorHandler.ts`), and the docs wording
follows the spec scenarios + D1–D6 verbatim. One scope note: the rollback
boundary lists 3 files instead of the 2 in the work order because the WU2
stale-comment fix (explicitly permitted as "fix if trivial") touched
`useFlashcardStudy.ts` with comment-only lines.

## Issues Found (WU3)

None. Backend dev-server restart required to pick up the fix (no hot reload);
reviewers re-running the malformed-JSON probe must restart their server too.

## Workload / PR Boundary (WU3)

- Mode: chained PR slice (stacked-to-main, PR 3 of 3)
- Current work unit: WU3 — docs sync + WARNING-1 fix
- Boundary: starts at verified WU1+WU2 tree, ends with docs in sync + malformed-JSON 400 live-proven + builds green
- Estimated review budget impact: PR3 slice = 16 insertions + 6 deletions (3 files), far under the 400-line budget
- Dependency diagram: `main` ← PR1 (backend validation, merged/parent) ← PR2 (deck store) ← 📍 PR3 (this slice: docs + `errorHandler.ts` + 2 comment lines)

## Cumulative Status (final)

15/15 tasks complete (WU1 10/10 + WU2 4/4 + WU3 1/1). WARNING-1 closed.
Ready for sdd-verify final gate, then sdd-archive.
