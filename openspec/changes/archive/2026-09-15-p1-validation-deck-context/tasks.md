# Tasks: P1 Validation + Shared Deck Store

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~400–450 (drafted tree ~316 + follow-ups ~120) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 backend validation + migration → PR 2 deck store → PR 3 docs + full matrix |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Backend validation + email-CI migration | PR 1 | `npm run build --prefix backend` | Manual curl 400/401/409 matrix vs local API | Revert backend files; `DROP INDEX uq_users_email_ci` |
| 2 | Deck store polish + single access path | PR 2 | `npm run build --prefix frontend` | Network tab: one `GET /decks`, logout clear, study-exit refetch ×1 | Revert `contexts/`, `hooks/useDecks.ts`, `App.tsx`, `main.tsx` |
| 3 | Docs sync + full verification gate | PR 3 | `npm run build --prefix backend; npm run build --prefix frontend` | N/A — docs-only; behavior proven in PR 1/2 harnesses | Revert `docs/project-context.md` only |

## Phase 1: Verify Drafted Foundation

- [x] 1.1 Verify `backend/src/core/validation/parseBody.ts` first-issue → `AppError(400)` `{ error }` shape
- [x] 1.2 Verify auth schemas in `backend/src/modules/auth/http/AuthController.ts` (trim/lowercase email, register pw ≥ 8)
- [x] 1.3 Verify `deckIdSchema` + `sessionBodySchema` aliases in `backend/src/modules/decks/http/DeckController.ts`
- [x] 1.4 Verify CTE atomic create in `backend/src/modules/decks/infra/PostgresDeckRepository.ts` (single statement)
- [x] 1.5 Verify `LOWER()` lookup in `backend/src/modules/auth/infra/PostgresUserRepository.ts`
- [x] 1.6 Verify `DeckProvider` mount in `frontend/src/main.tsx` + study-exit refetch guard in `frontend/src/App.tsx`

## Phase 2: Follow-up Hardening

- [x] 2.1 Create `backend/src/scripts/migrateEmailCi.ts`: collision pre-check abort-with-report, then `UNIQUE (LOWER(email))`
- [x] 2.2 Reorder `getFlashcards` + `deleteDeck` in `DeckController.ts`: 401 auth check before UUID parse
- [x] 2.3 Polish `frontend/src/contexts/DeckContext.tsx`: `useCallback` fetch, in-flight ref, clear-on-logout
- [x] 2.4 Re-export `refetch` in `frontend/src/hooks/useDecks.ts`; switch `App.tsx` to `useDecks` only

## Phase 3: Verification (no runner, strict_tdd false)

- [x] 3.1 Run `npm run build --prefix backend` + `npm run build --prefix frontend`; fix type errors
- [x] 3.2 Curl auth: bad register → 400 first-issue; 7-char pw → 400; `USER@x` login → 200; case-variant re-register → 409
- [x] 3.3 Curl decks: unauth bad UUID → 401, authed → 400; snake_case PATCH → 200; `currentIndex: -1` → 400
- [x] 3.4 Frontend: one `GET /decks` per session, study-exit refetch ×1, logout clears, no cross-account flash

## Phase 4: Docs Sync

- [x] 4.1 Update `docs/project-context.md`: 400 shapes, email normalization, 401-before-400 order, store contract
