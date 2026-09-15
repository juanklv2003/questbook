# Archive Report: p1-validation-deck-context

**Change**: p1-validation-deck-context
**Archived to**: `openspec/changes/archive/2026-09-15-p1-validation-deck-context/`
**Archive date**: 2026-09-15
**Artifact store**: openspec
**Verdict at close**: PASS_WITH_WARNINGS — archive-ready, SDD cycle complete

## Final State (terminal record — outranks intermediate snapshots)

- **Tasks**: 15/15 complete, 0 unchecked in persisted `tasks.md` (Phase 1: 1.1–1.6, Phase 2: 2.1–2.4, Phase 3: 3.1–3.4, Phase 4: 4.1). Task Completion Gate passed with no reconciliation needed.
- **Verification**: final `verify-report.md` envelope `evidence_revision sha256:a1f6be382259aca6c85a96d5bac7b1dfd37ad78a53d4525aef92ba5c3dd65dd6`, verdict `pass_with_warnings`, blockers 0, critical 0, requirements 9/9, scenarios 15/15, `test_exit 0`, `build_exit 0` (both `npm run build`s green).
- **WARNING-1 (malformed JSON 500) — FIXED and CLOSED LIVE**: `backend/src/core/middlewares/errorHandler.ts` (+8 lines, SyntaxError-from-`express.json()` → `400 {"error":"Invalid JSON body."}`). Final verify P1 probe confirms `400` post-fix (was `500` pre-fix). Fix landed during WU3, after the WU1 intermediate snapshot that flagged it — the snapshot's "open" claim is stale history, not current state.
- **S4 study-exit (sole PR2 deferred item) — CLOSED LIVE**: final verify ran a fresh Playwright session against `:5173` with a SQL-seeded deck (no test-only routes, seeded data cleaned up): login → exactly 1 `GET /decks`, 3 study enter/exit cycles → exactly +1 `GET` each, logout → login screen with 0 new `GET`. No static-cover acceptance was used.
- **Email-CI migration**: `backend/src/scripts/migrateEmailCi.ts` present-but-UNAPPLIED by maintainer decision. Fresh read-only pre-check at final verification: 0 collisions across 7 users — safe to apply when scheduled. Rollback ships in-script (`--down`: `DROP INDEX IF EXISTS uq_users_email_ci`, keeps `idx_users_email`).
- **CTE atomicity (D4)**: inspection-only proof (single-statement `WITH shifted AS (UPDATE ...) INSERT ...`); no fault-injection harness exists in the repo. Accepted limitation, recorded as WARNING-2 alongside the unapplied migration — neither blocks archive.
- **Commits**: no commits were created by any SDD batch. PR creation is owned by the orchestrator. At close the worktree holds drafted + WU3 changes uncommitted plus `openspec/` untracked. This archive creates no commits.
- **Review gate**: `reviewGate` structurally absent (no review ever discovered for this candidate). Per the Native Review Receipt Gate, archive proceeds under ordinary repository policy.

## Worktree Close State (no commit created, per handoff)

Modified (tracked):
- `backend/src/core/middlewares/errorHandler.ts` (WU3 WARNING-1 fix)
- `backend/src/modules/auth/http/AuthController.ts`
- `backend/src/modules/auth/infra/PostgresUserRepository.ts`
- `backend/src/modules/decks/http/DeckController.ts`
- `backend/src/modules/decks/infra/PostgresDeckRepository.ts`
- `docs/project-context.md` (WU3 §4/§5/§7 sync)
- `frontend/src/App.tsx`, `frontend/src/hooks/useDecks.ts`, `frontend/src/hooks/useFlashcardStudy.ts` (comment-only), `frontend/src/main.tsx`
- (plus pre-existing unrelated noise: `.atl/skill-registry.md`, `.gitignore` — not part of this change, left untouched)

Untracked (new):
- `backend/src/core/validation/` (`parseBody.ts`)
- `backend/src/scripts/migrateEmailCi.ts`
- `frontend/src/contexts/DeckContext.tsx`, `frontend/src/contexts/deck-context.ts`
- `openspec/` (this change's specs + archive; itself untracked)
- `.playwright-mcp/` (harness noise, not part of this change)

## Specs Synced (Step 2)

`openspec/specs/` was empty, so both delta specs were full specs copied mechanically (shell `cp.exe`, byte-identity proven by empty `diff -r`):

| Domain | Action | Details |
|--------|--------|---------|
| request-validation | Created `openspec/specs/request-validation/spec.md` | 6 requirements, 10 scenarios (envelope, email normalization, password rules, UUID params, session body, 401-before-400) |
| deck-store | Created `openspec/specs/deck-store/spec.md` | 3 requirements, 5 scenarios (fetch-once, logout clear, explicit refetch) |

Totals reconcile with verify-report: 9/9 requirements, 15/15 scenarios.

Destructive-delta check (`openspec/config.yaml` archive rule "warn before merging destructive deltas"): no REMOVED/RENAMED sections in either delta — creation only, non-destructive, no warning required.

## Archive Contents (Step 3)

- `proposal.md` ✅
- `exploration.md` ✅
- `specs/request-validation/spec.md` ✅
- `specs/deck-store/spec.md` ✅
- `design.md` ✅
- `tasks.md` ✅ (15/15 complete, 0 unchecked)
- `apply-progress.md` ✅ (WU1+WU2+WU3 merged, preserved verbatim)
- `verify-report.md` ✅ (final PASS_WITH_WARNINGS envelope above)
- `archive-report.md` ✅ (this file, additive-only, excluded from move readback)

Active `openspec/changes/` at close contains only `archive/`. The move used shell `mv.exe` (`git mv` inapplicable — `openspec/` is untracked) with a pre-move recursive snapshot and an empty `diff -r` readback.

## Mechanical Evidence (verbatim `diff -r` readbacks — empty is the only pass)

Step 2 spec sync:
```text
(diff -r change-spec vs main-spec for request-validation: no output)
DIFF-EXIT-REQUEST-VALIDATION=0
(diff -r change-spec vs main-spec for deck-store: no output)
DIFF-EXIT-DECK-STORE=0
```

Step 3 archive move (pre-move snapshot vs archived tree):
```text
(diff -r snapshot vs openspec/changes/archive/2026-09-15-p1-validation-deck-context: no output)
DIFF-EXIT-ARCHIVE-MOVE=0
```

Snapshot temp dir removed after passing readback. No Read→Write copy was used for any artifact bytes.

## Delivery / Review Budget

Cached strategy `ask-on-risk`, budget 400 lines. Delivered as 3 chained slices (PR1 backend ≈ 325, PR2 store ≈ 120–150, PR3 docs+fix 16+/6−), each under budget. Full-change diff per final verify: 10 tracked files (126+/84−) + 4 untracked new files. PR creation itself is orchestrator-owned and out of scope for this phase.

## Residual Risks / Follow-ups (non-blocking)

1. Migration rollout pending (maintainer schedules `migrateEmailCi.ts`; pre-check green, rollback documented).
2. CTE atomicity has inspection-only proof (no harness in repo; accepted).
3. Passive `/auth/me` 401s on unauthenticated loads are by-design noise.
4. Shared Playwright browser profile may hold a stale session for the destroyed `test.debug@example.com` probe user.

## Source of Truth Updated

- `openspec/specs/request-validation/spec.md` (new)
- `openspec/specs/deck-store/spec.md` (new)

## SDD Cycle Complete

Planned, implemented (15/15), verified (PASS_WITH_WARNINGS, 0 blockers), and archived. Ready for the next change.
