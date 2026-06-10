# Tasks: Auth System

## Phase 1: Foundation / Database Migrations

- [x] 1.1 Create SQL migration script to create `users` table with `idx_users_email` index.
- [x] 1.2 Create SQL migration script to add `user_id` to `decks`, insert a legacy user, update existing rows to point to legacy user, and add `NOT NULL` and FK constraints.
- [x] 1.3 Create backend domain interfaces in `backend/src/modules/auth/domain/` (`User.ts`, `IUserRepository.ts`, `IPasswordHasherPort.ts`, `ITokenServicePort.ts`).

## Phase 2: Backend Infrastructure Adapters

- [x] 2.1 Implement `BcryptPasswordHasher` in `backend/src/modules/auth/infra/BcryptPasswordHasher.ts`.
- [x] 2.2 Implement `JwtTokenService` in `backend/src/modules/auth/infra/JwtTokenService.ts`.
- [x] 2.3 Implement `PostgresUserRepository` in `backend/src/modules/auth/infra/PostgresUserRepository.ts`.

## Phase 3: Backend Use Cases

- [ ] 3.1 Implement `RegisterUseCase` in `backend/src/modules/auth/useCases/RegisterUseCase.ts` (validate payload, hash password, create user, return token payload).
- [ ] 3.2 Implement `LoginUseCase` in `backend/src/modules/auth/useCases/LoginUseCase.ts` (find user by email, compare password hash, return token payload).
- [ ] 3.3 Implement `LogoutUseCase` in `backend/src/modules/auth/useCases/LogoutUseCase.ts`.
- [ ] 3.4 Implement `GetCurrentUserUseCase` in `backend/src/modules/auth/useCases/GetCurrentUserUseCase.ts` (find user by ID from token payload).

## Phase 4: Backend HTTP Layer & Wiring

- [ ] 4.1 Implement `AuthMiddleware` in `backend/src/modules/auth/http/AuthMiddleware.ts` to extract and verify JWT from HttpOnly cookies.
- [ ] 4.2 Implement `AuthController` in `backend/src/modules/auth/http/AuthController.ts` to handle `register`, `login`, `logout`, and `me`, properly setting/clearing HttpOnly `SameSite=Strict` cookies.
- [ ] 4.3 Implement DI wiring and routes in `backend/src/modules/auth/http/AuthRouter.ts`.
- [ ] 4.4 Mount the `authRouter` on the main application server at `/api/v1/auth`.

## Phase 5: Frontend Infrastructure & Atoms

- [ ] 5.1 Update `frontend/src/lib/axios.ts` to configure `withCredentials: true` globally for sending HttpOnly cookies.
- [ ] 5.2 Implement `PasswordField` atom in `frontend/src/components/atoms/PasswordField.tsx` with local state to toggle `showPassword`.

## Phase 6: Frontend Core Components

- [ ] 6.1 Implement `LoginForm` organism in `frontend/src/components/organisms/LoginForm.tsx` managing email, password, and rememberMe inputs.
- [ ] 6.2 Implement `RegisterForm` organism in `frontend/src/components/organisms/RegisterForm.tsx` managing email, password, and confirmPassword validation.
- [ ] 6.3 Implement `AuthContainer` in `frontend/src/components/containers/AuthContainer.tsx` with a toggle state between Login and Register views.
- [ ] 6.4 Implement `AuthContext` provider in `frontend/src/contexts/AuthContext.tsx` calling backend APIs and tracking global `isAuthenticated`, `user`, and `isLoading` states.

## Phase 7: Frontend Wiring & Integration

- [ ] 7.1 Wrap the root application (`frontend/src/App.tsx` or `main.tsx`) with `<AuthContext.Provider>`.
- [ ] 7.2 Render `<AuthContainer />` inside the routing layer.

## Phase 8: Testing & Verification

- [ ] 8.1 Write backend tests: verify `POST /api/v1/auth/register` creates user and sets secure cookie.
- [ ] 8.2 Write backend tests: verify `POST /api/v1/auth/login` respects `rememberMe` for cookie expiration.
- [ ] 8.3 Write backend tests: verify `GET /api/v1/auth/me` retrieves the current user profile.
- [ ] 8.4 Verify migration scenario: `decks` correctly migrate unassigned entities to the legacy user.
- [ ] 8.5 Write frontend tests: verify `PasswordField` accurately toggles input type between `password` and `text`.
