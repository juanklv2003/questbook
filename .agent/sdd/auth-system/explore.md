# SDD Explore: Auth System

## 1. Feature Overview
The goal is to implement an authentication system for Memo AI. 
Requirements:
- Users table in the database.
- Registration and Login with Name, Email, and Password.
- "Eye" icon to toggle password visibility.
- "Keep me logged in" (Remember Me) checkbox.

## 2. Backend Implications (Hexagonal Architecture)

### 2.1 Database Changes
- **New Table**: `users`
  - `id` (UUID, Primary Key)
  - `name` (Text)
  - `email` (Text, Unique)
  - `password_hash` (Text)
  - `created_at` (Timestamp)
  - `updated_at` (Timestamp)
- **Modifications to Existing Tables**:
  - `decks`: Add `user_id` (UUID, Foreign Key to `users.id`). This will require a data migration strategy for existing decks (e.g., assigning to a default user or making it nullable temporarily).

### 2.2 New Module: `auth`
Following the Screaming Architecture principles:
- **Domain (`modules/auth/domain`)**:
  - `User` entity.
  - `IUserRepository` port.
  - `IPasswordHasher` port (for hashing/verifying).
  - `IAuthTokenService` port (for generating/verifying tokens).
- **Use Cases (`modules/auth/useCases`)**:
  - `RegisterUserUseCase`: validates uniqueness, hashes password, saves user.
  - `LoginUserUseCase`: validates credentials, returns tokens.
  - `GetMeUseCase`: retrieves the currently authenticated user's profile.
- **Infrastructure (`modules/auth/infra`)**:
  - `PostgresUserRepository`: Implements DB operations.
  - `BcryptPasswordHasher`: Uses `bcrypt` (or `argon2`) for secure password hashing.
  - `JwtTokenService`: Uses `jsonwebtoken` to sign and verify JWTs.
- **HTTP (`modules/auth/http`)**:
  - `AuthController` & `AuthRouter`.
  - Endpoints: `POST /register`, `POST /login`, `GET /me`, `POST /logout`.

### 2.3 Authentication & Session Management
- **Token Storage**: To protect against XSS, using **HttpOnly Cookies** is the recommended approach for JWTs.
- **Remember Me**: 
  - If checked, the JWT token and cookie `maxAge` will be set to a long duration (e.g., 30 days).
  - If unchecked, it will be a session cookie (expires when the browser is closed).
- **Endpoint Protection**: 
  - A new middleware `core/middlewares/authMiddleware.ts` will extract the JWT from the HttpOnly cookie, verify it, and attach `req.user`.
  - All `/api/v1/decks` endpoints must be updated to use this middleware.
  - Deck queries must be scoped by `user_id` so users only see their own decks.

## 3. Frontend Implications (Atomic Design)

### 3.1 Global State Management
- A React Context (e.g., `AuthContext` + `AuthProvider`) will wrap the application to provide global access to `user` state, `isAuthenticated`, `login`, `logout`, and `isLoading`.
- On initial load, the app will ping `/api/v1/auth/me` to check if a valid session exists.

### 3.2 UI Components
- **Atoms**: 
  - `Checkbox`: Basic styled checkbox for the "Remember me" functionality.
- **Molecules**:
  - `PasswordField`: Combines an `Input` atom and an eye icon (from `lucide-react`) with state to toggle `type="password"` vs `type="text"`.
  - `RememberMeField`: Combines the `Checkbox` atom with a label.
- **Organisms**:
  - `LoginForm`: Form containing Email, PasswordField, RememberMeField, and Submit button.
  - `RegisterForm`: Form containing Name, Email, PasswordField, and Submit button.
- **Containers**:
  - `LoginContainer` and `RegisterContainer` to handle form submission, API calls (via custom hooks like `useAuth`), error handling, and redirection.
- **Routing**:
  - Protected routes must be implemented. If an unauthenticated user tries to access `/decks`, they should be redirected to `/login`.

## 4. Dependencies
- **Backend**: `bcrypt` (or `argon2`), `jsonwebtoken`, `cookie-parser` (for handling HttpOnly cookies). Types for these will also be needed (`@types/bcrypt`, etc.).
- **Frontend**: No major new dependencies if using standard React Context, but might need utility functions for parsing form data or cookie handling if any explicit frontend manipulation is needed (though HttpOnly handles it mostly automatically).

## 5. Security & Risks
- **Risk**: Enforcing `user_id` on `decks` could break existing data.
  - *Mitigation*: Create a dummy/default user in the database and assign all existing decks to them during migration, or make `user_id` nullable initially.
- **Risk**: CSRF attacks when using cookies.
  - *Mitigation*: Configure CORS properly and ensure `SameSite=Strict` or `Lax` on cookies.
- **Risk**: Password exposure.
  - *Mitigation*: Enforce bcrypt/argon2 with appropriate salt rounds. Never log passwords or return them in API responses.
