## Exploration: p1-validation-deck-context

Backend request validation (zod + `AppError`) plus a single shared deck store
(`DeckContext`) that removes the double `GET /decks`. All seven P1 items were
found already drafted in the working tree (uncommitted); this exploration
reviews that draft against prior specs and surfaces risks before proposal.

### Current State

- `backend/src/core/validation/parseBody.ts` (new, untracked): `safeParse`
  wrapper; on failure throws `AppError(400, "<path>: <message>")` from
  `issues[0]`. Consumed by `AuthController` and `DeckController`. Fits the
  global `errorHandler` contract (`{ error: string }`, never a 500).
- `AuthController`: `emailSchema = z.string().trim().toLowerCase().pipe(z.email(...))`
  shared by register/login; register requires password >= 8, login requires
  non-empty password. Zod v4 API (`z.email`, `pipe`) matches `zod@^4.4.3`.
- `DeckController`: `deckIdSchema = z.uuid(...)` applied to every `:id`/`:deckId`
  param; `sessionBodySchema` (`currentIndex`, `results` record, camelCase +
  snake_case hash aliases, optional `finished`) for `PATCH /:id/session`.
  `generate()` and `updateShelf()` still use manual checks. `EvaluationController`
  is still fully manual (out of P1 scope).
- `PostgresDeckRepository.create`: single-statement CTE (`WITH shifted AS
  (UPDATE ...) INSERT ...`) — one implicit transaction, one round trip through
  the Neon `Pool`. `GenerateDeckUseCase` always passes `position: 0`
  (new books land first), matching the dashboard's optimistic insert.
- `PostgresUserRepository.findByEmail`: `WHERE LOWER(email) = LOWER($1)` so
  pre-normalization mixed-case accounts still log in. (Note: this repo uses
  `neon()` HTTP while deck repos use `Pool` — pre-existing inconsistency.)
- Frontend: `DeckProvider` (`contexts/DeckContext.tsx` + `deck-context.ts`
  split for react-refresh) fetches `GET /decks` once per authenticated session;
  `useDecks` is now a thin context accessor; `main.tsx` mounts the provider
  inside `AuthProvider`; `App.tsx` refetches when leaving a study session
  (`prevDeckId` ref guard). `useFlashcardStudy` sends exactly
  `{ currentIndex, results, flashcardsHash, finished }` — all covered by the
  session schema, so zod's default key-stripping is safe.
- Prior specs checked: `.agent/sdd/{memo-ai,auth-system,deck-management}/spec.md`
  (+ `router/explore.md`), `docs/project-context.md` (strict doc-sync rule),
  `openspec/config.yaml` (`strict_tdd: false`, no test runner; verify via
  `npm run build` on both sides; proposal MUST check `.agent/sdd`, specs use
  Given/When/Then + RFC 2119, backend changes follow Port -> Adapter ->
  UseCase -> Controller).

### Affected Areas

- `backend/src/core/validation/parseBody.ts` — new shared helper (untracked)
- `backend/src/modules/auth/http/AuthController.ts` — email/password schemas
- `backend/src/modules/decks/http/DeckController.ts` — UUID params, session body
- `backend/src/modules/decks/infra/PostgresDeckRepository.ts` — atomic CTE create
- `backend/src/modules/auth/infra/PostgresUserRepository.ts` — LOWER() lookup
- `frontend/src/contexts/DeckContext.tsx`, `frontend/src/contexts/deck-context.ts` — provider (untracked)
- `frontend/src/hooks/useDecks.ts` — thin accessor over context
- `frontend/src/main.tsx`, `frontend/src/App.tsx` — provider mount, study-exit refetch

### Approaches

1. **Validation errors: first-issue only (draft)** — `issues[0]` formatted as
   `"path: message"`.
   - Pros: readable single-string error, fits `{ error: string }` contract, trivial
   - Cons: multi-field forms report one problem per round trip
   - Effort: Low (done)
2. **Validation errors: full issue list** — return `{ error, details: [...] }`.
   - Pros: all problems at once
   - Cons: breaks the `{ error: string }` contract every frontend consumer
     (`AuthContext`, `useDecks`, interceptors) relies on; needs frontend changes
   - Effort: Medium
3. **Email normalization in zod pipe + LOWER() lookup (draft)** vs normalizing
   in the use case vs `CITEXT` column.
   - Pros (draft): single choke point, legacy mixed-case logins keep working
   - Cons: DB unique index is still case-sensitive (see Risks R1)
   - Effort: Low (done) + one migration for the index
4. **Atomic create via single-statement CTE (draft)** vs explicit
   `BEGIN/COMMIT` transaction vs previous two-trip sequence.
   - Pros (draft): atomic + single round trip (matters on Neon serverless);
     failed INSERT rolls back the position shift
   - Cons: bumps `updated_at` on all shifted shelf rows; concurrent creates can
     still duplicate `position: 0` (no unique constraint)
   - Effort: Low (done)
5. **Shared deck store via context provider (draft)** vs React Query/SWR (what
   `memo-ai/spec.md` originally suggested) vs per-hook fetch (before).
   - Pros (draft): zero new dependencies, removes double `GET /decks`, keeps
     data-fetching in `hooks/` per project-context rules
   - Cons: hand-rolled cache (no dedup/retry/stale-while-revalidate); small
     lifecycle gaps (see Risks R4)
   - Effort: Low (done)

### Recommendation

Keep the draft direction for all seven items: first-issue `parseBody`,
controller-level zod schemas, CTE create, LOWER() lookup, context provider.
It matches the existing `{ error: string }` contract, the hexagonal wiring,
and the hooks-in-`hooks/` frontend rule with no new dependencies. Fold the
follow-ups into the proposal: functional unique index on `LOWER(email)`,
uniform 401-before-400 ordering, `useCallback` + logout-clear in the provider,
`refetch` re-export through `useDecks`, and a `docs/project-context.md` sync
(its strict rule requires recording the new 400 shapes and normalization).

### Risks

- R1 (strongest): `users.email` unique index is case-sensitive, so the
  `23505 -> 409` race guard in `RegisterUseCase` does NOT catch
  `User@x` vs `user@x` duplicates; `findByEmail` would then return an
  ambiguous `rows[0]`. Needs `UNIQUE (LOWER(email))` migration. `LOWER()`
  also bypasses `idx_users_email` — make it a functional index.
- R2: inconsistent auth/validation order — `getFlashcards`/`deleteDeck`
  validate UUID *before* the 401 check, others *after*; unauthenticated callers
  get 400 on some routes and 401 on others for the same malformed id.
- R3: `generate()` and `updateShelf()` stay manual; `parseDeckColor` silently
  falls back to `'primary'` (lenient) while the rest of the controller is now
  strict — inconsistent strictness worth one follow-up task.
- R4: provider gaps — decks are NOT cleared on logout (stale cross-account
  flash), `fetchDecks` is not `useCallback` (App effect dep churn, currently
  harmless via the `prevDeckId` guard), StrictMode double-fires the fetch in
  dev (cancelled-flag guards state, not the request).
- R5: `useDecks` hides `refetch` while `App.tsx` imports `useDeckContext`
  directly — two access paths to one store; re-export `refetch` from `useDecks`.
- R6: spec drift — `.agent/sdd/auth-system/spec.md` documents top-level
  `{id, email}` responses but code returns `{ user: {...} }`; P1 must not add
  drift — sync `docs/project-context.md` in the proposal.
- R7: no test runner (`strict_tdd: false`); verification is
  `npm run build --prefix backend/frontend` + manual curl of 400/401/409 paths.

### Ready for Proposal

Yes. Proposal should accept the 7-item draft as-is, add follow-up tasks for
R1 (migration), R2 (ordering), R4/R5 (provider polish), R6 (doc sync), and a
rollback plan per `openspec/config.yaml` (working tree is uncommitted, so
rollback is `git stash`/checkout of the listed files).
