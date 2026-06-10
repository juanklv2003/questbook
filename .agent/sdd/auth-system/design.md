# Low-Level Technical Design: Auth System

This document outlines the low-level technical design for the authentication system, adhering to Hexagonal/Screaming Architecture for the backend and Atomic Design for the frontend.

## 1. Backend Architecture

### 1.1 Directory Structure
The new module will be located at `backend/src/modules/auth/`.

```text
backend/src/modules/auth/
├── domain/
│   ├── User.ts
│   ├── IUserRepository.ts
│   ├── IPasswordHasherPort.ts
│   └── ITokenServicePort.ts
├── useCases/
│   ├── RegisterUseCase.ts
│   ├── LoginUseCase.ts
│   ├── LogoutUseCase.ts
│   └── GetCurrentUserUseCase.ts
├── infra/
│   ├── PostgresUserRepository.ts
│   ├── BcryptPasswordHasher.ts
│   └── JwtTokenService.ts
└── http/
    ├── AuthController.ts
    ├── AuthRouter.ts
    └── AuthMiddleware.ts
```

### 1.2 Domain Interfaces

**`backend/src/modules/auth/domain/User.ts`**
```typescript
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**`backend/src/modules/auth/domain/IUserRepository.ts`**
```typescript
import { User } from './User';

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
}
```

**`backend/src/modules/auth/domain/IPasswordHasherPort.ts`**
```typescript
export interface IPasswordHasherPort {
  hash(password: string): Promise<string>;
  compare(password: string, hash: string): Promise<boolean>;
}
```

**`backend/src/modules/auth/domain/ITokenServicePort.ts`**
```typescript
export interface TokenPayload {
  userId: string;
  email: string;
}

export interface ITokenServicePort {
  generateToken(payload: TokenPayload, expiresIn?: string): string;
  verifyToken(token: string): TokenPayload;
}
```

### 1.3 Dependency Injection Wiring

The dependency injection will be performed manually in the `AuthRouter.ts` file, following the project's existing pattern.

**`backend/src/modules/auth/http/AuthRouter.ts`**
```typescript
import { Router } from 'express';
import { db } from '../../../config/db';
import { PostgresUserRepository } from '../infra/PostgresUserRepository';
import { BcryptPasswordHasher } from '../infra/BcryptPasswordHasher';
import { JwtTokenService } from '../infra/JwtTokenService';
import { RegisterUseCase } from '../useCases/RegisterUseCase';
import { LoginUseCase } from '../useCases/LoginUseCase';
import { LogoutUseCase } from '../useCases/LogoutUseCase';
import { GetCurrentUserUseCase } from '../useCases/GetCurrentUserUseCase';
import { AuthController } from './AuthController';
import { authMiddleware } from './AuthMiddleware';

// 1. Instantiate Adapters
const userRepository = new PostgresUserRepository(db);
const passwordHasher = new BcryptPasswordHasher();
const tokenService = new JwtTokenService(process.env.JWT_SECRET!);

// 2. Inject into Use Cases
const registerUseCase = new RegisterUseCase(userRepository, passwordHasher, tokenService);
const loginUseCase = new LoginUseCase(userRepository, passwordHasher, tokenService);
const logoutUseCase = new LogoutUseCase();
const getCurrentUserUseCase = new GetCurrentUserUseCase(userRepository);

// 3. Inject into Controller
const authController = new AuthController(
  registerUseCase,
  loginUseCase,
  logoutUseCase,
  getCurrentUserUseCase
);

// 4. Wire Router
const authRouter = Router();

authRouter.post('/register', authController.register);
authRouter.post('/login', authController.login);
authRouter.post('/logout', authController.logout);
authRouter.get('/me', authMiddleware(tokenService), authController.getCurrentUser);

export { authRouter };
```

---

## 2. Frontend Architecture

### 2.1 Directory Structure
We will introduce the new authentication artifacts following Atomic Design and a Context-based state management approach.

```text
frontend/src/
├── contexts/
│   └── AuthContext.tsx
├── components/
│   ├── atoms/
│   │   └── PasswordField.tsx
│   ├── organisms/
│   │   ├── LoginForm.tsx
│   │   └── RegisterForm.tsx
│   └── containers/
│       └── AuthContainer.tsx
└── lib/
    └── axios.ts (Configure withCredentials: true)
```

### 2.2 Auth Context

**`frontend/src/contexts/AuthContext.tsx`**
Provides global authentication state. It will use Axios to make requests and rely on HttpOnly cookies, thus no manual token management on the frontend.

- **State**: `user`, `isAuthenticated`, `isLoading`, `error`
- **Actions**: `login`, `register`, `logout`, `checkAuth`
- **Effect**: Runs `checkAuth()` on mount to query `/api/v1/auth/me`.

### 2.3 Component Design

**`frontend/src/components/atoms/PasswordField.tsx`**
- Extends standard HTML input attributes.
- Internal state: `showPassword` (boolean).
- UI: Input with a toggle eye icon on the right to switch `type="password"` and `type="text"`.

**`frontend/src/components/organisms/LoginForm.tsx`**
- Manages form state (`email`, `password`, `rememberMe`).
- Emits `onSubmit` with `LoginCredentials` payload.
- Displays `error` message if provided in props.

**`frontend/src/components/organisms/RegisterForm.tsx`**
- Manages form state (`email`, `password`, `confirmPassword`).
- Contains internal validation (e.g., passwords match).
- Emits `onSubmit` with `RegisterCredentials` payload.

**`frontend/src/components/containers/AuthContainer.tsx`**
- High-level container deciding whether to show `LoginForm` or `RegisterForm` based on user interaction (e.g., tabs or a toggle link).
- Connects directly to the `AuthContext` to trigger actions and handle loading/error states.

---

## 3. Database Schema Updates

Modifications will be made to handle schema updates via a script to ensure safe rollout.

1. **Create `users` table**:
   ```sql
   CREATE TABLE IF NOT EXISTS users (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     email VARCHAR(255) UNIQUE NOT NULL,
     password_hash VARCHAR(255) NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
   );
   ```

2. **Add `user_id` to `decks`**:
   ```sql
   ALTER TABLE decks ADD COLUMN IF NOT EXISTS user_id UUID;
   ```

3. **Data Migration Steps**:
   - Insert a fallback/legacy user.
   - Update existing rows in `decks` to set `user_id` to the legacy user's ID.
   - Add NOT NULL constraint and Foreign Key:
     ```sql
     ALTER TABLE decks ALTER COLUMN user_id SET NOT NULL;
     ALTER TABLE decks ADD CONSTRAINT fk_decks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
     ```
