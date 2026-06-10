# Apply Progress: Auth System

## Phase 1: Foundation / Database Migrations
- [x] 1.1 Create SQL migration script to create `users` table with `idx_users_email` index.
- [x] 1.2 Create SQL migration script to add `user_id` to `decks`, insert a legacy user, update existing rows to point to legacy user, and add `NOT NULL` and FK constraints.
- [x] 1.3 Create backend domain interfaces in `backend/src/modules/auth/domain/` (`User.ts`, `IUserRepository.ts`, `IPasswordHasherPort.ts`, `ITokenServicePort.ts`).

## Phase 2: Backend Infrastructure Adapters
- [x] 2.1 Implement `BcryptPasswordHasher` in `backend/src/modules/auth/infra/BcryptPasswordHasher.ts`.
- [x] 2.2 Implement `JwtTokenService` in `backend/src/modules/auth/infra/JwtTokenService.ts`.
- [x] 2.3 Implement `PostgresUserRepository` in `backend/src/modules/auth/infra/PostgresUserRepository.ts`.

## Phase 3: Backend Use Cases
- [x] 3.1 Implement `RegisterUseCase` in `backend/src/modules/auth/useCases/RegisterUseCase.ts`.
- [x] 3.2 Implement `LoginUseCase` in `backend/src/modules/auth/useCases/LoginUseCase.ts`.
- [x] 3.3 Implement `LogoutUseCase` in `backend/src/modules/auth/useCases/LogoutUseCase.ts`.
- [x] 3.4 Implement `GetCurrentUserUseCase` in `backend/src/modules/auth/useCases/GetCurrentUserUseCase.ts`.

## Phase 4: Backend HTTP Layer & Wiring
- [x] 4.1 Implement `AuthMiddleware` in `backend/src/modules/auth/http/AuthMiddleware.ts`.
- [x] 4.2 Implement `AuthController` in `backend/src/modules/auth/http/AuthController.ts`.
- [x] 4.3 Implement DI wiring and routes in `backend/src/modules/auth/http/AuthRouter.ts`.
- [x] 4.4 Mount the `authRouter` on the main application server at `/api/v1/auth`, and configured `cookie-parser` and `cors` for credentials.

## Phase 5: Frontend Infrastructure & Atoms
- [x] 5.1 Update `frontend/src/lib/axios.ts` to configure `withCredentials: true` globally for sending HttpOnly cookies.
- [x] 5.2 Implement `PasswordField` atom in `frontend/src/components/atoms/PasswordField.tsx` with local state to toggle `showPassword`.
- [x] 5.3 Implement `Input` atom for standard text inputs.

## Phase 6: Frontend Core Components
- [x] 6.1 Implement `LoginForm` organism in `frontend/src/components/organisms/LoginForm.tsx`.
- [x] 6.2 Implement `RegisterForm` organism in `frontend/src/components/organisms/RegisterForm.tsx`.
- [x] 6.3 Implement `AuthContainer` in `frontend/src/components/containers/AuthContainer.tsx`.
- [x] 6.4 Implement `AuthContext` provider in `frontend/src/contexts/AuthContext.tsx`.

## Phase 7: Frontend Wiring & Integration
- [x] 7.1 Wrap the root application (`frontend/src/main.tsx`) with `<AuthContext.Provider>`.
- [x] 7.2 Render `<AuthContainer />` inside `App.tsx` conditionally based on auth state.

## Summary
- Installed backend dependencies (`bcrypt`, `jsonwebtoken`, `cookie-parser`) and their types.
- Wrote and executed `migrateAuth.ts` which successfully created the `users` table and migrated `decks` to a legacy user.
- Created domain interfaces for Auth.
- Created infra implementations.
- Implemented core Use Cases (Register, Login, Logout, GetCurrentUser).
- Set up the HTTP layer: AuthController, AuthMiddleware (to enforce JWT via HttpOnly cookies), and AuthRouter.
- Mounted the routes in `app.ts` and secured the `/api/v1/decks` and `/api/v1/evaluations` endpoints.
- Configured frontend global `axios` instance with `withCredentials: true`.
- Created frontend Atoms (`PasswordField`, `Input`).
- Created frontend Organisms (`LoginForm`, `RegisterForm`).
- Created `AuthContainer` and `AuthContext` for global auth state management.
- Integrated `AuthContext` into `main.tsx` and conditionally rendered `AuthContainer` in `App.tsx`.

## Next Recommended Steps
- Run `sdd-verify` to ensure all tests and interactions are correctly implemented.
