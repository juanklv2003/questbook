# Proposal: P1 Validation + Shared Deck Store

## Intent

Close P1 gaps — ad-hoc 400s, case-sensitive login, non-atomic deck create, double `GET /decks` — by accepting the drafted 7-item tree plus hardening follow-ups.

## Scope

### In Scope
- `parseBody` helper (first-issue → `AppError` 400, fits `{ error: string }`)
- Auth zod schemas (trim/lowercase email; register password ≥ 8)
- Deck UUID params + session body schema (camelCase + snake_case aliases)
- CTE atomic create; `LOWER()` email lookup
- `DeckContext` provider + thin `useDecks` + `main.tsx` mount + `App.tsx` refetch
- Follow-ups: `UNIQUE (LOWER(email))` migration, 401-before-400 order, provider polish, `project-context.md` sync

### Out of Scope
- `EvaluationController` / `generate()` / `updateShelf()` zod migration
- CITEXT, React Query, test runner, error-envelope redesign
- `{ user }` vs `{ id, email }` drift fix (record only)

## Capabilities

### New Capabilities
- `request-validation`: backend body/param validation contract (400 shape, normalization, UUID + session schemas)
- `deck-store`: single shared frontend deck store (fetch-once, logout clear, refetch API)

### Modified Capabilities
- None (`openspec/specs/` empty; `.agent/sdd/{auth-system,deck-management,memo-ai}` consulted, not mutated)

## Approach

Accept draft direction: controller-level zod via `parseBody`, single-statement CTE (one Neon round trip), zero-dependency context store. Follow-ups land as tasks; verify via both `npm run build`s + manual curl (400/401/409). No new dependencies (zod v4 present).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/core/validation/parseBody.ts` | New | Shared safeParse → AppError(400) helper |
| `backend/.../auth/http/AuthController.ts` | Modified | Email/password zod schemas |
| `backend/.../decks/http/DeckController.ts` | Modified | UUID params, session body schema |
| `backend/.../decks/infra/PostgresDeckRepository.ts` | Modified | CTE atomic create |
| `backend/.../auth/infra/PostgresUserRepository.ts` | Modified | LOWER() email lookup |
| `backend/src/scripts/migrate*` | New | UNIQUE(LOWER(email)) migration |
| `frontend/src/contexts/DeckContext.tsx` | New | Provider, fetch-once per session |
| `frontend/src/hooks/useDecks.ts` | Modified | Thin accessor, re-export refetch |
| `frontend/src/main.tsx`, `App.tsx` | Modified | Provider mount, study-exit refetch |
| `docs/project-context.md` | Modified | Record 400 shapes + normalization |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Case-variant duplicate emails bypass 409 guard | High | Functional unique index migration (follow-up task) |
| Inconsistent 401-before-400 ordering | Med | Uniform guard-order task |
| Stale decks flash across accounts on logout | Med | Clear-on-logout + useCallback polish |
| `generate()`/`updateShelf()` stay manual/lenient | Low | Deferred follow-up, documented |
| No test runner | Low | Both builds + manual curl verification |

## Rollback Plan

Tree is uncommitted: `git stash push` or `git checkout -- <listed files>`; delete untracked `parseBody.ts`, `DeckContext.tsx`, `deck-context.ts`. Migration not yet applied — nothing to revert. `openspec/` itself untracked.

## Dependencies

- None. Pre-existing `neon()` vs `Pool` split left untouched.

## Success Criteria

- [ ] Both `npm run build`s pass; curl proves 400/401/409 paths
- [ ] One `GET /decks` per session; no cross-account flash on logout
- [ ] `project-context.md` records 400 shapes + normalization
