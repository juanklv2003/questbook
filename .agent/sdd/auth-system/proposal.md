# Proposal: auth-system

## Intent
Look, building an app without a proper auth system is tutorial-level garbage. We are implementing a rock-solid, production-ready authentication system for Memo AI. We need REAL user management, not some fake "enter your name" mockup. This addresses the absolute necessity of isolating user data (decks) securely so users only see THEIR data. No shortcuts.

## Scope

### In Scope
- A complete `auth` module using STRICT Hexagonal/Screaming Architecture.
- Database `users` table and migration for the `decks` table to link `user_id`.
- Robust password hashing using `bcrypt` or `argon2`. No plaintext nonsense.
- Secure session management using **HttpOnly Cookies** and JWT. Stop putting tokens in LocalStorage like an amateur.
- "Remember Me" functionality (Session vs 30-day cookie).
- Frontend global state via `AuthContext`.
- Atomic Design UI components: `LoginForm`, `RegisterForm`, and a `PasswordField` molecule (with the eye toggle icon).

### Out of Scope
- OAuth (Google/Github login) - focus on email/password fundamentals first.
- Email verification / password reset flows. We'll add those later. Keep the scope tight.
- Role-based access control (RBAC). Admin panels are out of scope.

## Approach
We are applying real engineering here. 

**Backend (Hexagonal):**
- Domain: `User` entity, `IUserRepository`, `IPasswordHasher`, `IAuthTokenService`.
- Use Cases: `RegisterUserUseCase`, `LoginUserUseCase`, `GetMeUseCase`.
- Infra: `PostgresUserRepository`, `BcryptPasswordHasher`, `JwtTokenService`.
- HTTP: `AuthController` + HttpOnly cookie handling to prevent XSS. A global `authMiddleware` to protect `/decks`.

**Data Migration:**
We CANNOT just add `user_id` to `decks` and break the app. The migration strategy:
1. Create the `users` table.
2. Insert a "System Default User" or a "Legacy User".
3. Add `user_id` to `decks` as nullable.
4. Backfill existing decks with the "Legacy User" ID.
5. Make `user_id` NOT NULL.

**Frontend (Atomic Design):**
- Global state handled by `AuthContext`.
- We'll build a `PasswordField` molecule (Input + lucide-react eye icon).
- Forms (`LoginForm`, `RegisterForm`) mapped to `LoginContainer` / `RegisterContainer` to handle the fetching and context updates.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `modules/auth/*` | New | Entire Hexagonal auth module |
| `core/middlewares/authMiddleware.ts` | New | JWT extraction and verification |
| `modules/decks/*` | Modified | Endpoints and queries MUST filter by `user_id` |
| `db/migrations/` | New | SQL scripts for `users` and `decks` alteration |
| `frontend/src/contexts/AuthContext.tsx` | New | Global auth state |
| `frontend/src/components/molecules/PasswordField.tsx` | New | Password toggle input |
| `frontend/src/components/organisms/*` | New | Login/Register forms |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Breaking existing deck data | High | Strict 5-step data migration strategy using a Legacy User backfill. |
| XSS / CSRF vulnerabilities | Med | Use HttpOnly cookies (mitigates XSS) + Strict SameSite config + CORS (mitigates CSRF). |
| Context Re-renders | Low | Standard `AuthContext` memoization to prevent full-app re-renders on minor state changes. |

## Rollback Plan
If the DB migration fails, run the DOWN migration script which drops `user_id` from `decks` and drops the `users` table. 
If the API deployment causes authentication loops, revert the `authMiddleware` requirement on `/decks` until fixed.

## Dependencies
- `bcrypt` or `argon2`, `jsonwebtoken`, `cookie-parser` on the backend.
- `lucide-react` (for the eye icon) on the frontend.

## Success Criteria
- [ ] Users can register, login, and logout.
- [ ] `AuthContext` correctly reflects `isAuthenticated` state.
- [ ] JWT is safely stored in an HttpOnly cookie (NOT LocalStorage).
- [ ] "Remember Me" toggle sets correct cookie expiration.
- [ ] Old decks are not orphaned (successfully assigned to Legacy User).
- [ ] Decks API returns only the logged-in user's decks.
