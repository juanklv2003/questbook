# Design: Memo AI Backend Low-Level Architecture

Listen to me. You want to build a Node.js + TypeScript backend. We are doing this right. No spaghetti code, no controllers talking directly to the database. We are strictly following the Hexagonal (Ports and Adapters) Architecture from the proposal. 

Here is the exact blueprint. Do not deviate.

## 1. Exact Folder Structure & Configuration

The backend will live in `memo-server/`. We use a module-based structure (Screaming Architecture).

```text
memo-server/
├── tsconfig.json          # Strict mode enabled. No implicit any.
├── package.json
├── src/
│   ├── server.ts          # Entry point (app.listen)
│   ├── app.ts             # Express app configuration & middleware
│   ├── config/
│   │   ├── env.ts         # Zod validation for process.env (FAIL FAST if keys are missing)
│   │   └── db.ts          # Neon DB instance setup
│   ├── core/
│   │   ├── errors/        # AppError, globalErrorHandler
│   │   ├── middlewares/   # catchAsync, validateRequest
│   │   └── types/         # Global types
│   ├── modules/
│   │   ├── decks/
│   │   │   ├── domain/    # Entities, Ports (Interfaces)
│   │   │   ├── useCases/  # Application logic classes
│   │   │   ├── infra/     # Adapters (Postgres Repositories, AI Clients)
│   │   │   └── http/      # Express Router, Controllers, Zod Schemas
│   │   ├── flashcards/
│   │   │   └── ...        # Same structure
│   │   └── evaluations/
│   │       └── ...        # Same structure
```

### Configuration
- **TypeScript**: `strict: true`, `target: ES2022`, `moduleResolution: node`.
- **Environment**: Use `zod` in `src/config/env.ts` to validate `DATABASE_URL` and `GEMINI_API_KEY`. If they are missing at startup, the app crashes immediately.

## 2. Base Interfaces for Hexagonal Architecture (Ports)

The `domain` layer defines the contracts. The `useCases` rely on these contracts. The `infra` layer implements them.

```typescript
// src/modules/decks/domain/IDeckRepository.ts
export interface IDeckRepository {
  create(deck: Omit<Deck, 'id' | 'createdAt' | 'updatedAt'>): Promise<Deck>;
  findById(id: string): Promise<Deck | null>;
}

// src/modules/flashcards/domain/IFlashcardRepository.ts
export interface IFlashcardRepository {
  createMany(flashcards: Omit<Flashcard, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<Flashcard[]>;
  findByDeckId(deckId: string): Promise<Flashcard[]>;
}

// src/modules/decks/domain/IFlashcardGeneratorPort.ts
export interface IFlashcardGeneratorPort {
  generateFromText(text: string): Promise<Array<{ question: string; answer: string }>>;
}

// src/modules/evaluations/domain/IEvaluatorPort.ts
export interface IEvaluatorPort {
  evaluate(question: string, correctAnswer: string, userAnswer: string): Promise<{
    score: number;
    isCorrect: boolean;
    feedback: string;
  }>;
}
```

## 3. Dependency Injection Strategy

We are NOT using heavy frameworks like NestJS or magic decorators (Inversify) for now. We will use **Manual Constructor Injection** to keep our code clean, testable, and free of vendor lock-in.

Each module will have a `router.ts` file that acts as the composition root for that module.

```typescript
// src/modules/decks/http/DeckRouter.ts
import { Router } from 'express';
import { GenerateDeckUseCase } from '../useCases/GenerateDeckUseCase';
import { PostgresDeckRepository } from '../infra/PostgresDeckRepository';
import { GeminiFlashcardGenerator } from '../infra/GeminiFlashcardGenerator';
import { DeckController } from './DeckController';

// 1. Instantiate Adapters
const deckRepo = new PostgresDeckRepository(db);
const aiGenerator = new GeminiFlashcardGenerator();

// 2. Inject into Use Case
const generateDeckUseCase = new GenerateDeckUseCase(deckRepo, aiGenerator);

// 3. Inject into Controller
const deckController = new DeckController(generateDeckUseCase);

// 4. Wire Router
const deckRouter = Router();
deckRouter.post('/generate', upload.single('file'), deckController.generate);

export { deckRouter };
```

This makes testing `GenerateDeckUseCase` trivial: you just pass mock objects in the constructor.

## 4. Error Handling Design

No `try/catch` blocks cluttering every controller. We use a centralized error handling strategy.

1. **AppError Class**: A custom error class for operational errors.
```typescript
// src/core/errors/AppError.ts
export class AppError extends Error {
  constructor(public statusCode: number, public message: string, public isOperational = true) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this);
  }
}
```

2. **Async Wrapper**: Catch unhandled promise rejections in Express controllers.
```typescript
// src/core/middlewares/catchAsync.ts
import { Request, Response, NextFunction } from 'express';
export const catchAsync = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
```

3. **Global Error Handler**:
```typescript
// src/core/middlewares/errorHandler.ts
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  console.error('UNEXPECTED ERROR:', err);
  return res.status(500).json({ error: 'Internal Server Error' });
};
```

## Next Steps
This design is locked. The backend architecture is strictly defined. The next phase is `sdd-tasks` to break this down into actionable implementation steps. Do not start coding until the tasks are defined.
