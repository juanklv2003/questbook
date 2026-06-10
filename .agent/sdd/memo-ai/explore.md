## Exploration: memo-ai

### Current State
The project "Memo AI" is currently uninitialized. There is an initial requirements document (`flashyCOmienzo.txt`) that defines the tech stack (React, TypeScript, Tailwind, Node.js, Express, PostgreSQL via Neon, Gemini API) and core features (PDF to flashcards, free-text evaluation). The system requires bootstrapping both the frontend (`memo-client`) and backend (`memo-server`), defining the database schema, and establishing communication.

### Affected Areas
- `memo-client/` — New frontend application (Vite + React + TS + Tailwind).
- `memo-server/` — New backend API (Node + Express + TS).
- `Neon PostgreSQL` — Database schema creation (Folders, Decks, Flashcards).

### Approaches

1. **Monorepo Strategy (Turborepo/Nx)**
   - **Pros**: Easy to share TypeScript interfaces between client and server (e.g., API payloads, DB models). Unified build process.
   - **Cons**: Might add unnecessary complexity for the initial bootstrapping phase.
   - **Effort**: Medium

2. **Standard Dual-Folder Setup (Recommended)**
   - **Pros**: Matches exactly what the user requested ("inicializar las dos carpetas: memo-client y memo-server"). Simple, standard, and easy to orchestrate. 
   - **Cons**: Requires keeping shared types (like the evaluation JSON or DB models) manually synchronized between both codebases.
   - **Effort**: Low

### Architecture & Design Considerations
Given the user's profile (Senior Architect, advocate for Clean/Hexagonal Architecture):
- **Backend Structure**: We should not use a flat structure. We need a layered architecture (e.g., `src/routes`, `src/controllers`, `src/services`, `src/config`, `src/db`) to ensure Solid Foundations.
- **Database**: Use `@neondatabase/serverless` for HTTP-based serverless connections, which avoids connection limits in serverless environments. 
- **AI Integration**: The backend will act as the orchestrator for the Gemini API. We must ensure prompts enforce strict JSON formats (`response_mime_type: "application/json"`).

### Recommendation
Proceed with the **Standard Dual-Folder Setup**. We will define:
1. Exact terminal commands for scaffolding Vite/React and Node/Express.
2. A layered directory structure for `memo-server` (Clean Architecture principles).
3. The initial `server.ts` integrating CORS and `@neondatabase/serverless`.
4. The SQL DDL for Neon (Folders, Decks, Flashcards) including foreign keys and basic constraints.

### Risks
- **PDF Extraction**: `pdf-parse` can struggle with complex PDFs (columns, images). We must handle extraction errors gracefully.
- **AI Output Consistency**: Gemini must consistently return strict JSON for both flashcard generation and answer evaluation. A fallback mechanism or strict schema validation (like Zod) will be needed.
- **Database Connection**: Ensuring the Neon connection string is properly configured and managed via `.env`.

### Ready for Proposal
Yes. The requirements are clear enough to define the exact commands, folder structure, code, and SQL queries requested by the user. The next step is `sdd-propose` to formalize the delivery of these items.
