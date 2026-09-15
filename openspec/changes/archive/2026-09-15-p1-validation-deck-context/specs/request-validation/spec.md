# Request Validation Specification

## Purpose

Unified backend request-validation contract for auth and deck routes: consistent 400 shape, email/password rules, UUID params, session body aliases, and 401-before-400 ordering.

Assumptions: first-issue-only 400 is acceptable (one problem per round trip); `{ user }` vs `{ id, email }` drift stays record-only.

## Requirements

### Requirement: Validation Failure Envelope

The system MUST reject any invalid JSON body or route param with HTTP 400 and body `{ error: string }` describing only the first issue as `"<path>: <message>"`.

#### Scenario: Invalid body returns first issue only

- GIVEN a POST to `/api/v1/auth/register` with an invalid email and a short password
- WHEN the system validates the request
- THEN it MUST return 400 with `{ error: string }`
- AND the error MUST describe only the first issue

#### Scenario: Valid body passes validation

- GIVEN a well-formed request body
- WHEN the system validates the request
- THEN it MUST NOT return 400 and SHALL continue to auth/business logic

### Requirement: Auth Email Normalization

The system MUST trim surrounding whitespace, lowercase, and validate format for every `email` on register and login, and lookup SHALL match case-insensitively so legacy mixed-case accounts keep working.

#### Scenario: Case-variant login succeeds

- GIVEN an account stored as `User@Example.com`
- WHEN a login arrives with `email` `"  USER@example.com  "`
- THEN the system MUST normalize before lookup and SHALL authenticate with correct password

#### Scenario: Malformed email rejected

- GIVEN a register body with `email` `"not-an-email"`
- WHEN the system validates the request
- THEN it MUST return 400 with `{ error: string }`

### Requirement: Auth Password Rules

The system MUST require register `password` with length >= 8 and MUST require login `password` to be non-empty.

#### Scenario: Short register password rejected

- GIVEN a register body with a 7-character password
- WHEN the system validates the request
- THEN it MUST return 400 with `{ error: string }`

#### Scenario: Empty login password rejected

- GIVEN a login body with `password` `""`
- WHEN the system validates the request
- THEN it MUST return 400 with `{ error: string }`

### Requirement: Deck UUID Route Parameters

The system MUST validate every `:id` / `:deckId` on deck routes as UUID and return 400 `{ error: string }` for malformed values.

#### Scenario: Malformed deck id rejected

- GIVEN an authenticated GET to `/api/v1/decks/not-a-uuid/flashcards`
- WHEN the system validates the route param
- THEN it MUST return 400 with `{ error: string }`

### Requirement: Study Session Body

The system MUST accept PATCH `/api/v1/decks/:id/session` bodies with `currentIndex` (integer >= 0), `results` (object mapping id to boolean), optional `flashcardsHash` / `flashcards_hash` (string or null), optional `finished` (boolean), and unknown keys SHALL be ignored.

#### Scenario: Snake_case alias accepted

- GIVEN an authenticated PATCH with `{ currentIndex: 2, results: {}, flashcards_hash: "abc" }`
- WHEN the system validates the body
- THEN it MUST accept the request and SHALL treat `flashcards_hash` as `flashcardsHash`

#### Scenario: Negative index rejected

- GIVEN a PATCH body with `currentIndex: -1`
- WHEN the system validates the body
- THEN it MUST return 400 with `{ error: string }`

### Requirement: Authentication-Before-Validation Order

The system MUST return 401 for unauthenticated callers before evaluating 400 param/body validation on all protected deck routes.

#### Scenario: Unauthenticated malformed id returns 401

- GIVEN no valid session cookie and GET `/api/v1/decks/not-a-uuid/flashcards`
- WHEN the request arrives
- THEN the system MUST return 401 and MUST NOT return 400
