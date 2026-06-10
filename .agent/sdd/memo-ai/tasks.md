# Tasks: Memo AI Implementation

This document breaks down the implementation of Memo AI into actionable, granular tasks based on the strict requirements defined in the Spec and Design artifacts.

## Phase 1: Backend Setup & Core Infrastructure
- **Task 1.1:** Initialize Node.js project in `memo-server/`, install dependencies, and configure `tsconfig.json` (strict mode, ES2022).
- **Task 1.2:** Implement strict environment variable validation using Zod in `src/config/env.ts` (fail fast on missing keys).
- **Task 1.3:** Set up `src/server.ts` and `src/app.ts` with basic Express configuration.
- **Task 1.4:** Implement central Error Handling: Create `AppError.ts`, `catchAsync.ts`, and `errorHandler.ts` in `src/core`.
- **Task 1.5:** Set up Neon DB connection in `src/config/db.ts`.

## Phase 2: Backend Domain & Adapters
- **Task 2.1:** Define Domain Ports (Interfaces) in `src/modules/*/domain`: `IDeckRepository`, `IFlashcardRepository`, `IFlashcardGeneratorPort`, `IEvaluatorPort`.
- **Task 2.2:** Implement Database Repositories in `src/modules/*/infra`: `PostgresDeckRepository` and `PostgresFlashcardRepository`.
- **Task 2.3:** Implement `GeminiFlashcardGenerator` adapter implementing `IFlashcardGeneratorPort` with Prompt A (strictly enforcing JSON output).
- **Task 2.4:** Implement `GeminiEvaluator` adapter implementing `IEvaluatorPort` with Prompt B (strictly enforcing JSON output).

## Phase 3: Backend Use Cases & HTTP Layer
- **Task 3.1:** Implement `GenerateDeckUseCase` (orchestrating `IDeckRepository`, `IFlashcardGeneratorPort`, and `IFlashcardRepository`).
- **Task 3.2:** Implement HTTP Controllers (`DeckController`, `EvaluationController`).
- **Task 3.3:** Configure Routers (`DeckRouter`, `EvaluationRouter`) as composition roots using Manual Constructor Injection for DI.
- **Task 3.4:** Mount all routers under `/api/v1` in `app.ts` and configure `multer` for `multipart/form-data` uploads.

## Phase 4: Frontend Setup & Hooks
- **Task 4.1:** Initialize React TSX environment (or utilize existing) and define standard API contracts/types.
- **Task 4.2:** Implement `useDecks()` and `useDeckGenerator()` custom hooks handling API calls and loading states.
- **Task 4.3:** Implement `useFlashcardStudy()` (session state) and `useEvaluator()` (submit answer, store feedback) custom hooks.

## Phase 5: Frontend Components (Container-Presentational)
- **Task 5.1:** Create Atoms: `Button`, `TextArea`, `Badge` (pure visual components).
- **Task 5.2:** Create Molecules: `Flashcard` (handles flip animation/state), `EvaluationResult` (displays score and feedback).
- **Task 5.3:** Create Organisms: `DeckUploader` (drag & drop, inputs), `StudyPlayer` (combines Flashcard and input UI).
- **Task 5.4:** Create Containers: `StudySessionContainer` and `DeckDashboardContainer` to wire custom hooks down to the Organisms without layout logic.

## Phase 6: Integration & Final Polish
- **Task 6.1:** Connect Frontend Containers to Backend API endpoints handling CORS appropriately.
- **Task 6.2:** End-to-end testing of the full Deck generation flow (Text/PDF -> Backend -> Gemini -> Frontend).
- **Task 6.3:** End-to-end testing of the Evaluation flow (User answer -> Backend -> Gemini -> Score UI).
