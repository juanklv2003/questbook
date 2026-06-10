# Memo AI - Project Context

> **Note for AI Agents**: This document is the single source of truth for the architecture, tech stack, and conventions of the Memo AI project. Read it carefully before making any structural changes or implementations.

## 1. Project Overview
Memo AI is an AI-powered flashcard generation and study application. It allows users to upload PDF documents or text, automatically generates flashcards using AI, and provides a study interface that evaluates user answers using AI to give accurate feedback and scores.

## 2. Tech Stack

### Backend (`backend`)
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL (using `pg` driver)
- **AI Integration**: Google Generative AI (`@google/generative-ai`)
- **Other tools**: `multer` for file uploads, `zod` for validation.

### Frontend (`frontend`)
- **Framework**: React 19 + Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4, `clsx`, `tailwind-merge`
- **Icons**: `lucide-react`
- **Animations**: `framer-motion`
- **HTTP Client**: `axios`

## 3. Architecture

### Backend: Screaming / Hexagonal Architecture
The backend is organized by feature modules, shouting what the application does. Inside each module, Hexagonal Architecture (Ports and Adapters) principles are applied.

**Directory Structure:**
```
backend/src/
├── core/             # Shared logic, middlewares, errors
├── config/           # Database and environment configs
└── modules/          # Feature modules (Screaming Architecture)
    ├── auth/         # Authentication and user management
    ├── decks/
    ├── flashcards/
    └── evaluations/
```

**Inside a Module (e.g., `decks/`):**
- `domain/`: Entities (`Deck.ts`) and Ports (`IDeckRepository.ts`, `IFlashcardGeneratorPort.ts`, `ICloudStoragePort.ts`). Contains NO external dependencies.
- `useCases/`: Application specific business rules (e.g., `GenerateDeckUseCase.ts`, `ListDecksUseCase.ts`, `DeleteDeckUseCase.ts`). Depends only on Domain.
- `infra/`: Adapters that implement Ports (e.g., `PostgresDeckRepository.ts`, `GeminiFlashcardGenerator.ts`, `CloudinaryStorageAdapter.ts`). Depends on external tools like `pg`, `@google/generative-ai`, or `cloudinary`.
- `http/`: Controllers and Routers (e.g., `DeckController.ts`, `DeckRouter.ts`). Express specific layer.

### Frontend: Atomic Design + Container/Presentational Pattern
The frontend uses a strict combination of Atomic Design for UI components and the Container/Presentational pattern for logic separation.

**Directory Structure:**
```
frontend/src/
├── components/
│   ├── atoms/        # Basic UI blocks (Button, Input)
│   ├── molecules/    # Combinations of atoms (Form fields)
│   ├── organisms/    # Complex UI sections (DeckUploader)
│   └── containers/   # Logic wrappers (DeckDashboardContainer, handles state/hooks)
├── hooks/            # Custom React hooks containing business logic and API calls
├── lib/              # Utility functions
└── types/            # Global TypeScript interfaces
```

**Rule**: Presentational components (`atoms`, `molecules`, `organisms`) should NOT contain data-fetching logic or heavy state. They should receive data and callbacks via props. Stateful logic and hook consumption happens in `containers`.

## 4. Database Schema
The system uses PostgreSQL.

### Table: `users`
- `id` (UUID, Primary Key)
- `email` (VARCHAR(255), Unique)
- `password_hash` (VARCHAR(255))
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

### Table: `decks`
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key to `users.id`)
- `name` (Text)
- `folder_id` (UUID, Optional/Nullable)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

### Table: `flashcards`
- `id` (UUID, Primary Key)
- `deck_id` (UUID, Foreign Key to `decks.id`)
- `question` (Text)
- `answer` (Text)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

*(Note: Schema migrations are handled manually or through an external script not tracked in `.sql` files within the repo currently. Use the Repository pattern `infra` classes as the source of truth for queries).*

## 5. API Endpoints

The API is served at `/api/v1`.

### Authentication (`/api/v1/auth`)
- `POST /register`: Registers a new user. Expects JSON `{ email, password }`. Returns `{ user, token }` and sets an HttpOnly cookie with the JWT.
- `POST /login`: Logs in an existing user. Expects JSON `{ email, password, rememberMe }`. Returns `{ id, email }` and sets an HttpOnly cookie with the JWT.
- `POST /logout`: Logs out the current user by clearing the HttpOnly cookie.
- `GET /me`: Returns the current user's info based on the HttpOnly cookie.

### Decks (`/api/v1/decks`)
- `GET /`: Lists all decks, ordered by creation date descending. Returns an array of decks including a computed `flashcardsCount`.
- `POST /generate`: Uploads a PDF or text to generate a new deck. Expects `multipart/form-data` with `file` (optional) and `name` (required). Uses Gemini AI to extract flashcards. Returns the new deck info.
- `GET /:deckId/flashcards`: Retrieves all flashcards associated with a specific `deckId`.
- `DELETE /:id`: Deletes a specific deck. Uses DB cascades to remove associated flashcards and removes the source file from Cloudinary (via `ICloudStoragePort`).

### Evaluations (`/api/v1/evaluations`)
- `POST /evaluate`: Evaluates a user's answer against a flashcard. Expects JSON `{ flashcardId, userAnswer }`. Uses Gemini AI to determine correctness. Returns `{ isCorrect, score, feedback }`.

## 6. App AI & UX Guidelines

### AI Prompt Constraints (Gemini)
- **Strict Spanish Output**: All generated flashcards, feedback, and AI interactions MUST be strictly in Spanish.
- **Zero Hallucination Policy (0%)**: The AI must extract information strictly from the provided context (e.g., uploaded PDFs) and must not invent or hallucinate outside information.

### UX/UI Principles
- **Split-Screen Layout**: The frontend uses a split-screen layout for optimal study focus, dividing the screen between the deck management/listing and the active flashcard interaction area.
- **Keyboard Navigation**: Support keyboard interactions across the app, specifically allowing users to submit inputs and forms by pressing `Enter`.
- **Clear Interactive Cursors**: All clickable or interactive elements must use standard cursor pointers (e.g., `cursor-pointer`) to clearly indicate interactivity.

## 7. AI Agent Instructions
- **Do not bypass the Architecture**: If you add a feature, create the Domain Port, implement the Infra Adapter, build the UseCase, and wire it in the HTTP Controller.
- **Frontend State**: Keep API calls inside `hooks/` and consume them in `containers/`. Do not fetch data inside `organisms/`.
- **Imports**: Avoid barrel files outside of their direct folder scopes. Use explicit paths when crossing boundaries.
- **STRICT DOCUMENTATION RULE**: ANY future updates, new endpoints, or architectural changes MUST be documented in this `project-context.md` file immediately so it never goes out of sync. This file is the absolute source of truth.
