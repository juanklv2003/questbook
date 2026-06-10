# SDD Explore: React Router Implementation

## 1. Current State
The application (`frontend/src/App.tsx`) currently handles routing and layout through conditional rendering based on two state variables:
- `isAuthenticated` (from `AuthContext`)
- `activeDeckId` (local component state)

This approach has limitations:
- No URL updates (can't bookmark or share specific views like a study session).
- Back/forward browser buttons don't work.
- "God component" `App.tsx` doing too many things (auth checking, layout, state routing).

## 2. Requirements
- Use `react-router-dom`.
- English routes:
  - `/login`
  - `/register`
  - `/dashboard`
  - `/decks/:id`
- Route Guards (`ProtectedRoute`) using existing `AuthContext` to protect authenticated views.

## 3. Architectural Exploration & Trade-offs

### A. Router Type: `BrowserRouter` vs Data Router (`createBrowserRouter`)
**Option 1: Classic `BrowserRouter` with `<Routes>`**
- **Pros:** Simpler mental model, closer to what React developers are traditionally used to (v5 and early v6). Very easy to drop into the existing `App.tsx`.
- **Cons:** Missing modern v6.4+ features like `loaders`, `actions`, and concurrent data fetching.

**Option 2: Data Router (`createBrowserRouter` / `RouterProvider`)**
- **Pros:** The official recommendation from React Router. Enables powerful patterns like fetching data *before* rendering the component (`loader`), handling form submissions natively (`action`), and better error boundaries.
- **Cons:** Slightly steeper learning curve and boilerplate for initial setup.
- **Decision:** Use **Data Router (`createBrowserRouter`)**. We are building a solid architectural foundation. Even if we don't immediately use `loaders`/`actions`, we prepare the app for when we migrate data fetching out of `useEffect`.

### B. Route Guards and AuthContext Integration
We need a `ProtectedRoute` component to handle auth verification.
- **How it works:** It will call `useAuth()`.
  - If `isLoading` is true: render the loading spinner (already present in `App.tsx`).
  - If `!isAuthenticated`: render `<Navigate to="/login" replace />`.
  - If authenticated: render `<Outlet />` or `children`.
- **Public vs Auth Routes:** Unauthenticated users shouldn't access `/dashboard`, but authenticated users shouldn't see `/login` or `/register` again. We should also implement a `PublicRoute` or `GuestRoute` that redirects authenticated users to `/dashboard` if they visit `/login`.

### C. Layout Changes
Currently, `App.tsx` contains the layout (Header, Main, Footer). With React Router, we should use Layout Routes.
- **`AuthLayout`:** For `/login` and `/register`. Minimal header (logo only).
- **`ProtectedLayout`:** For `/dashboard` and `/decks/:id`. Wrapped with `ProtectedRoute`. Contains the full header (logo, user info, logout) and footer.
- `App.tsx` will be stripped of its UI responsibilities and will primarily return the `RouterProvider` wrapped by `AuthProvider`.

## 4. Proposed File Structure Additions
- `frontend/src/router/index.tsx` (Route definitions)
- `frontend/src/components/layouts/AuthLayout.tsx`
- `frontend/src/components/layouts/ProtectedLayout.tsx`
- `frontend/src/components/router/ProtectedRoute.tsx`
- `frontend/src/components/router/GuestRoute.tsx`
- Refactoring `AuthContainer` into separate `Login` and `Register` views (or keeping it but routing to it appropriately).

## 5. Potential Risks & Mitigation
- **Auth Checking Delay:** `checkAuth()` in `AuthContext` takes time. The app will show a loading state initially. If the routing is applied before auth finishes, it might prematurely redirect. *Mitigation:* Ensure `RouterProvider` or `ProtectedRoute` accurately respects the `isLoading` state from `AuthContext` before making redirection decisions.
- **Local State `activeDeckId` Loss:** Currently, state is passed down. We need to refactor `StudySessionContainer` to read the ID from the URL (`useParams`) instead of receiving it as a prop.
