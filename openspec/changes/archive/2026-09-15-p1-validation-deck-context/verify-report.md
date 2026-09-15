```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:a1f6be382259aca6c85a96d5bac7b1dfd37ad78a53d4525aef92ba5c3dd65dd6
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 9/9
scenarios: 15/15
test_command: curl live harness vs http://localhost:3000 — P1-P11 (malformed-400, auth 400/200/409, decks 401/400/404) + Playwright S4-session vs :5173 (login 1xGET, 3 study-exits x 1xGET, logout 0xGET) + disposable-user cleanup + migration pre-check (no runner per openspec/config.yaml)
test_exit_code: 0
test_output_hash: sha256:c9aaa894668842e79c54875e690ca2b699b301b08f5aaa5f53c4f40b7cf393ff
build_command: npm run build --prefix backend; npm run build --prefix frontend
build_exit_code: 0
build_output_hash: sha256:59adb37c200646a1a0e0ad7120b454c32b44b93e1a212263f426b778970cc030
```

## Verification Report

**Change**: p1-validation-deck-context — FINAL GATE (full change, all 15 tasks, archive-readiness)
**Version**: N/A
**Mode**: Standard (strict_tdd false, no test runner — builds + live curl/browser harnesses per `openspec/config.yaml`)

**Scope note**: full 15-task matrix re-verified with fresh runtime evidence. WARNING-1 (malformed-JSON 500) re-probed live and closed (P1). PR1 backend matrix fully re-probed live (P1-P11). Deck-store: S4 study-exit — the only deferred item from the PR2 report — is now covered by a fresh live harness (S4-session: SQL-seeded deck + real UI enter/exit flow, no test-only routes, seeded data cleaned up afterwards); H1-H5 adopted results for S1-S3/S5-concurrency stand (deck-store sources unchanged since that harness — WU3 touched only docs, `errorHandler.ts`, and two comments).

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 15 |
| Tasks complete | 15 (1.1–1.6, 2.1–2.4, 3.1–3.4, 4.1 — all `[x]`) |
| Tasks incomplete | 0 |

### Build & Tests Execution
**Build**: ✅ Passed (both re-executed by verifier)
```text
npm run build --prefix backend → exit 0 (tsc, strict, no errors)
npm run build --prefix frontend → exit 0 (tsc -b && vite build, 2239 modules; pre-existing chunk-size warning only)
```

**Tests**: ✅ 15/15 compliant / ❌ 0 failed / ❌ 0 untested
```text
Live curl harness vs local API :3000 (11 probes, all match spec):
P1 malformed JSON → 400 {"error":"Invalid JSON body."} (was 500 pre-fix — WARNING-1 closed)
P2 bad register → 400 {"error":"email: Email inválido"} (first issue only, password also invalid)
P3 7-char pw → 400 password ≥ 8; P4 empty login pw → 400 obligatoria
P5 unauth GET /decks/not-a-uuid/flashcards → 401 (not 400)
P6 register disposable → 201; P7 login "  UPPER+spaces  " → 200 same id (trim+lowercase)
P8 case-variant re-register → 409 {"error":"User already exists"}
P9 authed bad UUID → 400 {"error":"ID de libro inválido"}
P10 currentIndex:-1 → 400 Too small >=0
P11 snake_case valid body on missing deck → 404 (body validation passed; 200-persisted alias proof adopted from WU1 live run on a real deck)
Cleanup-1: disposable DELETEd via SQL, users 8→7. Migration pre-check re-run read-only: 7 users, 0 collisions (script NOT executed — rollout stays with maintainer).
S4-session (Playwright live vs :5173, StrictMode ON, disposable + SQL-seeded zero-card deck):
login → exactly ONE GET /decks [200] (2 consumers); 3 study enter/exit cycles → exactly +1 GET [200] each (reqs 70/73/76, never duplicated per trigger); logout → login screen, deck names gone, ZERO new GET; console shows only benign passive /auth/me 401s (by design).
Cleanup-2: disposable + seeded deck DELETEd via SQL cascade, users 8→7 (DB restored).
Full per-probe transcript hashed in test_output_hash.
```

**Coverage**: ➖ Not available (no runner; threshold 0 per config)

### Spec Compliance Matrix
| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| Validation Failure Envelope | Invalid body returns first issue only | P2 live: 400 email-only | ✅ COMPLIANT |
| Validation Failure Envelope | Valid body passes validation | P6 201 + P7 200 live | ✅ COMPLIANT |
| Auth Email Normalization | Case-variant login succeeds | P7 live: UPPER+spaces → 200 | ✅ COMPLIANT |
| Auth Email Normalization | Malformed email rejected | P2 live: 400 | ✅ COMPLIANT |
| Auth Password Rules | Short register password rejected | P3 live: 400 | ✅ COMPLIANT |
| Auth Password Rules | Empty login password rejected | P4 live: 400 | ✅ COMPLIANT |
| Deck UUID Route Parameters | Malformed deck id rejected | P9 live authed → 400 | ✅ COMPLIANT |
| Study Session Body | Snake_case alias accepted | WU1 live 200-persist adopted + P11 404-pass live | ✅ COMPLIANT |
| Study Session Body | Negative index rejected | P10 live: 400 | ✅ COMPLIANT |
| Authentication-Before-Validation Order | Unauthenticated malformed id returns 401 | P5 live: 401 | ✅ COMPLIANT |
| Fetch-Once Per Session | Single fetch shared by consumers | S4-session live: login → 1 GET with 2 consumers (StrictMode) + H1/H4 adopted | ✅ COMPLIANT |
| Fetch-Once Per Session | Unauthenticated session fetches nothing | H3 adopted (0 GET) — path untouched since | ✅ COMPLIANT |
| Logout Clear | No cross-account flash | S4-session live: logout → login screen, 0 new GET + H2/H5 adopted | ✅ COMPLIANT |
| Explicit Refetch API | Study-exit refresh | S4-session live: 3 exits → +1 GET each (reqs 70/73/76) | ✅ COMPLIANT |
| Explicit Refetch API | No duplicate GET on refetch trigger | live: 3 exits × exactly-1-GET (never >1 per trigger) + StrictMode concurrent-collapse of the shared in-flight primitive (H1/H4 adopted; guard calls the identical primitive, App.tsx:44) | ✅ COMPLIANT |

**Compliance summary**: 15/15 scenarios compliant

### Correctness (Static Evidence)
| Requirement | Status | Notes |
|------------|--------|-------|
| Validation Failure Envelope | ✅ Implemented | `parseBody.ts`: `issues[0]` → `AppError(400)`; `errorHandler` SyntaxError branch → 400 `{ error }`; P1 live |
| Auth Email Normalization | ✅ Implemented | `emailSchema` trim+lowercase pipe; `LOWER()` lookup (`PostgresUserRepository.ts:18`); `migrateEmailCi.ts` present, pre-check 0 collisions, unapplied by design |
| Auth Password Rules | ✅ Implemented | register min 8, login min 1 (`AuthController.ts:16-25`); P3/P4 live |
| Deck UUID Route Parameters | ✅ Implemented | `z.uuid()` `deckIdSchema`; P9 live |
| Study Session Body | ✅ Implemented | `sessionBodySchema` aliases + unknown-keys stripped; alias merge `DeckController.ts:188`; P10/P11 live |
| Authentication-Before-Validation Order | ✅ Implemented | `getFlashcards`/`deleteDeck` 401-before-parse (`DeckController.ts:104-115,127-138`); P5 live |
| Fetch-Once Per Session | ✅ Implemented | single list-fetch call site (`DeckContext.tsx:52`); stable `useCallback` + `inFlightRef`; S4-session live |
| Logout Clear | ✅ Implemented | sync `setDecks([])` on auth→false + `authRef` late-response drop (`DeckContext.tsx:70-83`); S4-session live |
| Explicit Refetch API | ✅ Implemented | `refetch` re-exported via `useDecks`; null-transition guard (`App.tsx:40-45`); S4-session live ×3 |

### Coherence (Design)
| Decision | Followed? | Notes |
|----------|-----------|-------|
| D1 first-issue `{ error }` shape | ✅ Yes | verbatim, incl. SyntaxError branch (the exact WU1-flagged fix) |
| D2 email identity (pipe + LOWER + functional index) | ✅ Yes | migration SQL verbatim; code-first ordering kept |
| D3 401-before-400 order | ✅ Yes | uniform across all protected handlers, double-guarded by routes |
| D4 single-statement CTE create | ✅ Yes | `WITH shifted AS (UPDATE …) INSERT …` (`PostgresDeckRepository.ts:28`); code-inspection only, no fault-injection harness available |
| D5 shared deck store (zero deps) | ✅ Yes | `authRef` addition within D5 no-flash intent |
| D6 single access path via `useDecks` | ✅ Yes | `useDeckContext` referenced only in `deck-context.ts` + `useDecks.ts`; `App.tsx` uses `useDecks` only |
| Docs sync (4.1) | ✅ Yes | `project-context.md` §4 email-CI (L83), §5 validation contract + SyntaxError + pw/409 (L126), decks guard order + UUID + alias (L129/L135), §7 store contract (L154); stale `useFlashcardStudy` comments corrected (L131/L345) |

### Review-Budget Check
Full-change diff: 10 tracked files (126+/84−) + 4 untracked new files (`parseBody.ts` 19, `migrateEmailCi.ts` 76, `DeckContext.tsx` 90, `deck-context.ts` 23). Delivered as 3 chained slices (PR1 backend ≈ 325, PR2 store ≈ 120–150, PR3 docs+fix 16+/6−), each under the 400-line budget per the cached ask-on-risk strategy. This verify batch authored 0 repo lines (harness + env only).

### Issues Found
**CRITICAL**: None
**WARNING**:
1. Migration script NOT executed (rollout decision stays with maintainer by design). Fresh read-only pre-check: 7 users, 0 collisions — safe to apply when scheduled. Rollback ships in-script (`--down` drops `uq_users_email_ci`, keeps `idx_users_email`).
2. CTE atomicity (D4) proven by code inspection only — no fault-injection harness exists in this repo. Accepted: single-statement writes are implicitly transactional in Postgres; failure-injection would require test scaffolding out of scope for this change.
**SUGGESTION**:
1. Console shows 2 passive `/auth/me` 401s on every unauthenticated load (checkAuth by design) — noisy but intentional; ignore unless a runner ever asserts console-cleanliness.
2. Working-tree noise outside this change (`.atl/skill-registry.md`, `.gitignore` modifications, `.playwright-mcp/` untracked) — not part of this change, left untouched.
3. The shared Playwright browser profile may still hold the stale session for `test.debug@example.com` (destroyed server-side during PR2 H2) — re-login there if the profile owner needs it.

### Verdict
**PASS WITH WARNINGS** (archive-ready): 15/15 tasks complete, 9/9 requirements and 15/15 scenarios runtime-COMPLIANT, both builds exit 0, WARNING-1 closed live, docs in sync. S4 study-exit — the sole deferred item from the PR2 report — is closed by fresh live evidence (3 exits × exactly-1-GET), NOT by accepted static cover; no item remains deferred. The two WARNINGs (unapplied migration, inspection-only CTE proof) are rollout/evidence-scope notes, not spec gaps — neither blocks archive.
