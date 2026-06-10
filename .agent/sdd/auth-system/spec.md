# Auth System Specification

## Purpose
A production-ready authentication system using strictly Hexagonal/Screaming Architecture on the backend and Atomic Design on the frontend. This specification details the exact technical contracts required for the `auth-system` implementation.

## Requirements

### Requirement: REST API Endpoints
The system MUST provide an auth controller with the following endpoints, strict JSON payloads, and proper HttpOnly cookie management.

#### POST /api/v1/auth/register
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "strongPassword123!"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "id": "uuid",
    "email": "user@example.com"
  }
  ```
- **Side Effect**: Sets `HttpOnly`, `SameSite=Strict`, `Secure` cookie with the JWT token.
- **Scenario: Successful Registration**
  - GIVEN valid email and password
  - WHEN a POST request is made to `/api/v1/auth/register`
  - THEN the user is created in the database
  - AND a 201 response is returned
  - AND an HttpOnly cookie containing the JWT is set

#### POST /api/v1/auth/login
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "strongPassword123!",
    "rememberMe": true
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "id": "uuid",
    "email": "user@example.com"
  }
  ```
- **Side Effect**: Sets `HttpOnly` cookie with the JWT. If `rememberMe` is true, sets a 30-day expiration; otherwise, uses a Session cookie.
- **Scenario: Successful Login**
  - GIVEN an existing user with matching credentials
  - WHEN a POST request is made to `/api/v1/auth/login`
  - THEN a 200 response is returned
  - AND an HttpOnly cookie containing the JWT is set with expiration based on `rememberMe`

#### POST /api/v1/auth/logout
- **Request Body**: None
- **Response (200 OK)**:
  ```json
  {
    "message": "Logged out successfully"
  }
  ```
- **Side Effect**: Clears the HttpOnly JWT cookie.
- **Scenario: Successful Logout**
  - GIVEN an authenticated user
  - WHEN a POST request is made to `/api/v1/auth/logout`
  - THEN the HttpOnly JWT cookie is cleared
  - AND a 200 response is returned

#### GET /api/v1/auth/me
- **Request Body**: None (Relies on HttpOnly cookie)
- **Response (200 OK)**:
  ```json
  {
    "id": "uuid",
    "email": "user@example.com"
  }
  ```
- **Scenario: Get Current User**
  - GIVEN a valid JWT in the HttpOnly cookie
  - WHEN a GET request is made to `/api/v1/auth/me`
  - THEN a 200 response is returned with the user's basic info

### Requirement: Database Schema Changes
The database MUST contain a `users` table and `decks` MUST be linked to `users`.

#### `users` Table
- `id`: `UUID` PRIMARY KEY DEFAULT `gen_random_uuid()`
- `email`: `VARCHAR(255)` UNIQUE NOT NULL
- `password_hash`: `VARCHAR(255)` NOT NULL
- `created_at`: `TIMESTAMP` NOT NULL DEFAULT `NOW()`
- `updated_at`: `TIMESTAMP` NOT NULL DEFAULT `NOW()`
- **Indices**:
  - `idx_users_email` ON `users (email)`

#### `decks` Table Modifications
- Add column `user_id`: `UUID`
- Add Foreign Key constraint: `CONSTRAINT fk_decks_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE`
- **Indices**:
  - `idx_decks_user_id` ON `decks (user_id)`

- **Scenario: Migrating Decks**
  - GIVEN an existing database with unassigned decks
  - WHEN the migration runs
  - THEN a `users` table is created
  - AND a Legacy User is created
  - AND existing decks are updated to point to the Legacy User's `user_id`
  - AND the `user_id` column is set to `NOT NULL`

### Requirement: Frontend React Components
The frontend MUST implement global auth state and atomic form components with precise interfaces.

#### `AuthContext`
```typescript
interface User {
  id: string;
  email: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextProps extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}
```

#### `LoginForm` (Organism)
```typescript
interface LoginFormProps {
  onSubmit: (credentials: LoginCredentials) => void;
  isLoading?: boolean;
  error?: string | null;
}
// Internal State manages email, password, and rememberMe inputs.
```

#### `RegisterForm` (Organism)
```typescript
interface RegisterFormProps {
  onSubmit: (credentials: RegisterCredentials) => void;
  isLoading?: boolean;
  error?: string | null;
}
// Internal State manages email, password, and confirmPassword inputs.
```

#### `PasswordField` (Molecule)
```typescript
interface PasswordFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}
// Internal State manages 'showPassword' boolean for toggling input type between 'password' and 'text'.
```

- **Scenario: Toggling Password Visibility**
  - GIVEN a `PasswordField` component rendered on screen
  - WHEN the user clicks the eye icon
  - THEN the input type changes from `password` to `text`
  - AND the eye icon changes state
