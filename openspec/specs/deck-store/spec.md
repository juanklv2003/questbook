# Deck Store Specification

## Purpose

Single shared frontend deck store: one fetch per authenticated session, immediate clear on logout, explicit refetch API, and no duplicate `GET /decks`.

Assumptions: logout clears decks immediately (no graceful retention); React Query/SWR stay out of scope; data-fetching lives in `hooks/`, consumed by containers.

## Requirements

### Requirement: Fetch-Once Per Authenticated Session

The system MUST fetch `GET /decks` exactly once when an authenticated session becomes active and MUST reuse the cached list for all consumers until refetch or logout.

#### Scenario: Single fetch shared by consumers

- GIVEN an authenticated user with two mounted deck consumers
- WHEN the session becomes active
- THEN the system MUST issue exactly one `GET /decks`
- AND both consumers SHALL render from the same cached list

#### Scenario: Unauthenticated session fetches nothing

- GIVEN no authenticated user
- WHEN the app renders deck consumers
- THEN the system MUST NOT issue `GET /decks`

### Requirement: Logout Clear

The system MUST clear the cached deck list immediately on logout so the next account never sees the previous account's decks.

#### Scenario: No cross-account flash

- GIVEN a cached deck list and the user logs out
- WHEN logout completes
- THEN the deck list MUST be empty
- AND a subsequent login SHALL trigger a fresh `GET /decks`

### Requirement: Explicit Refetch API

The system MUST expose a single `refetch` function through the shared store that re-fetches `GET /decks` and updates all consumers.

#### Scenario: Study-exit refresh

- GIVEN stale progress after leaving a study session
- WHEN the app calls `refetch`
- THEN the system MUST re-issue `GET /decks` and SHALL update every consumer

#### Scenario: No duplicate GET on refetch trigger

- GIVEN a refetch triggered by study-exit navigation
- WHEN the navigation guard fires repeatedly in one frame
- THEN the system MUST NOT issue more than one `GET /decks` per explicit trigger
