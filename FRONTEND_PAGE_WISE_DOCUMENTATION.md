# Frontend Documentation (Page-wise) — React + TypeScript Concepts Used

Monorepo folder: `internship-frontend/`

This document is written **page-wise (route-wise)** and explains:
- Which **React** + **TypeScript** concepts are used
- **Why** they are used (the design reason)
- Where they exist in the codebase (main files)

---

## Tech Stack (Frontend)

- Build tool: **Vite** (`internship-frontend/package.json`)
- UI: **React** + **TypeScript**
- Routing: **react-router-dom** with **lazy loading + Suspense**
- State: **Redux Toolkit** (slices + listener middleware)
- Hasura GraphQL client: **Apollo Client** + custom wrapper (`hasuraRequest`, `subscribeHasura`)
- Auth: **Firebase Auth**
- Payments UI: **Stripe Elements**
- Validation: **Zod**
- Persistence: `localStorage` (JWT) + **IndexedDB** (via `idb`)
- Theming: `ThemeContext` (light/dark with CSS variables)

---

## App Shell (cross-cutting concepts used everywhere)

### 1) App bootstrap + Providers
Main file: `internship-frontend/src/main.tsx`

React concepts used
- **Provider composition** (`<ApolloProvider>`, `<Provider>`, `<ThemeProvider>`, `<Elements>`, `<ToastProvider>`)
- **StrictMode** for catching side-effect issues in development
- **ErrorBoundary** (Sentry wrapper) to prevent full app crash on runtime errors

Why used
- Keeps global dependencies (store, theme, Stripe, GraphQL client) available to every page without prop-drilling.

TypeScript concepts used
- Non-null assertion for DOM mount: `document.getElementById("root")!`

### 2) Routing + code splitting
Files:
- `internship-frontend/src/app/router/appRouter.tsx`
- `internship-frontend/src/app/router/routeHelpers.tsx`
- `internship-frontend/src/components/ProtectedRoute.tsx`

React concepts used
- **Route-based code splitting** via `lazy(() => import(...))`
- **Suspense fallback UI** while loading chunks
- **Protected routes** using a wrapper component (`ProtectedRoute`)

Why used
- Faster initial load (only load a page when the user visits it).
- Centralized access control logic for “must be logged in” and “guest allowed/not allowed”.

TypeScript concepts used
- `RouteObject` types for router configuration
- Prop typing (`children: ReactNode`, `allowGuest?: boolean`)

### 3) Global state (Redux Toolkit)
Files:
- `internship-frontend/src/app/store.ts`
- `internship-frontend/src/features/auth/authSlice.ts`
- `internship-frontend/src/features/products/cartSlice.ts`
- `internship-frontend/src/features/todos/todoSlice.ts`
- `internship-frontend/src/features/products/cartListener.ts`

React/Redux concepts used
- **Slices** (`createSlice`) for feature-based state
- **Selector hooks** (`useAppSelector`) to read global state
- **Dispatch hook** (`useAppDispatch`) to update state
- **Listener middleware** to run side effects after state changes (cart sync + persistence)

Why used
- Auth + cart + todos are shared across multiple pages, so global state avoids prop drilling and keeps behavior consistent.

TypeScript concepts used
- Strongly typed actions: `PayloadAction<T>`
- Union types (example): `AuthProvider = "password" | "google" | "github" | "guest"`

### 4) Hasura GraphQL access layer (queries, mutations, subscriptions)
Files:
- `internship-frontend/src/utils/hasuraClient.ts`
- `internship-frontend/src/utils/apolloClient.ts`
- `internship-frontend/src/features/products/hasuraCommerce/*`
- `internship-frontend/src/hooks/useHasuraSubscription.ts`

React concepts used
- Custom hook `useHasuraSubscription` to manage WebSocket subscription lifecycle in React (`useEffect`, cleanup)

Why used
- One consistent pattern for:
  - Attaching JWT (`Authorization: Bearer ...`)
  - Retry on transient network failures
  - WebSocket subscriptions for real-time UI updates

TypeScript concepts used
- Generics for typed GraphQL responses: `hasuraRequest<T>(...)`
- Utility types: `Omit<...>` for derived shapes
- Literal union types: `PaymentStatus = "pending" | "succeeded" | ...`

### 5) Persistence (localStorage + IndexedDB)
Files:
- `internship-frontend/src/utils/indexedDb.ts`
- `internship-frontend/src/utils/hasuraClient.ts`

Concepts used
- `localStorage["jwt"]` for the Hasura session token (required to call Hasura GraphQL securely).
- IndexedDB object stores for per-user offline persistence:
  - todos
  - cart fallback (when Hasura sync fails)

Why used
- JWT persistence keeps the session across refresh.
- IndexedDB prevents data loss when offline / Hasura is temporarily unreachable.

---

## Page-wise Documentation

### Page: `/login` (Login)
Main file: `internship-frontend/src/features/auth/Login.tsx`

React concepts used
- `useState` for form state + UI toggles (email, password, show/hide password, loading, errors)
- `useLocation` + `useNavigate` for redirecting after login (back to the protected page)
- Conditional rendering for error messages and linking UI

Why used
- Keeps form logic local to the page, while navigation uses router state (`location.state.from`) to preserve user intent.

TypeScript concepts used
- Union types (auth provider): `type AuthProvider = "password" | "google" | "github" | "guest"`
- Discriminated shapes for stored OAuth linking (`PendingOAuthLinkStored`)
- Type-narrowing / runtime validation helpers for unknown Firebase `customData`

Backend/Hasura connection used
- Actual Hasura JWT is acquired via the auth exchange in `internship-frontend/src/features/auth/authListener.ts` (calls action `authLogin`).

### Page: `/signup` (Create account + send OTP)
Main file: `internship-frontend/src/features/auth/Signup.tsx`

React concepts used
- `useState` for form state + UI feedback (password strength, loading/success/error)
- Two-step UI in the same route (`form` → `otp`) before creating the Firebase user

Why used
- Signup is split into **create account** and **verify email** (OTP) to enforce verified email before non-OAuth logins.

TypeScript concepts used
- Typed error handling for Firebase: `FirebaseError`
- Zod parsing result checking (`safeParse`) for strict input validation

Hasura action used
- `sendOtp(email, purpose)` via GraphQL POST to Hasura endpoint.

### Page: `/verify-otp` (Email OTP verification)
Main file: `internship-frontend/src/features/auth/VerifyOtp.tsx`

React concepts used
- `useSearchParams` + `useMemo` to initialize email from query string
- `useState` for OTP input state + success/error messages

Why used
- Lets the user verify the OTP after signup (or resend OTP).

TypeScript concepts used
- Shared Hasura action client (`internship-frontend/src/features/auth/otpApi.ts`)
- Regex-based runtime validation for email + OTP format

Hasura actions used
- `sendOtp`
- `verifyOtp`

### Page: `/` (Dashboard / Home)
Main file: `internship-frontend/src/pages/Home.tsx`

React concepts used
- Presentational component composition (`AppLayout`, `FeatureCard`)

Why used
- Single entry dashboard that links to major modules (Todos, Products, GitHub).

TypeScript concepts used
- Component props typing in reusable components (used by `FeatureCard`)

### Page: `/todos` (Todos)
Main file: `internship-frontend/src/features/todos/TodosPage.tsx`

React concepts used
- `useEffect` for hydration (load from IndexedDB after auth resolves)
- `useRef` (`hydrated`) to prevent saving before initial load finishes
- Pagination derived state (page size, visible slice)

Why used
- Demonstrates local CRUD + persistence per user without a backend dependency.
- Guest restriction logic (“max 3 todos”) is enforced in UI.

TypeScript concepts used
- Strongly typed Redux state (`Todo` interface)
- Zod validation on input text (both in page and again in slice reducer as a “final safety net”)

Persistence
- Reads/writes todos from IndexedDB (`loadTodosForUser`, `saveTodosForUser`)

### Page: `/github` (GitHub Search)
Main file: `internship-frontend/src/features/github/GithubPage.tsx`

React concepts used
- Debounced input (`useDebounce`) to reduce API calls
- `useMemo` to compute validation errors and to validate debounced query
- Custom hooks that wrap `fetch` + abort (`AbortController`) for cleanup

Why used
- Prevents spamming the GitHub API and improves UX while typing.

TypeScript concepts used
- Union for UI mode: `type Mode = "users" | "repos"`
- Generic hook pattern (`useGithubFetch<T>`) for typed data shapes

### Page: `/products` (Product list)
Main file: `internship-frontend/src/features/products/ProductsPage.tsx`

React concepts used
- Data fetching hook (`useGetProductsQuery`)
- `useMemo` for derived filtered list (search)
- Conditional rendering for loading/error states and skeleton UI

Why used
- Keeps filtering fast and avoids re-filtering on every render when inputs don’t change.

TypeScript concepts used
- Strong typing for product model (`Product`)
- Typed `React.MouseEvent` in click handlers

Hasura used
- Hasura **query**: `products(order_by: { id: asc })` (via `fetchProducts`)

### Page: `/product/:id` (Product detail)
Main file: `internship-frontend/src/features/products/ProductDetailPage.tsx`

React concepts used
- `useParams` + schema validation for route param
- Local UI state: quantity selector + “added” feedback
- Conditional UI for stock state (out-of-stock / low stock)

Why used
- Prevents invalid route params from triggering a bad network call.

TypeScript concepts used
- Runtime parsing via Zod + compile-time typing (`useParams<{ id: string }>()`)

Hasura used
- Hasura **query**: `products_by_pk(id: $id)`

### Page: `/cart` (Cart)
Main file: `internship-frontend/src/features/products/CartPage.tsx`

React concepts used
- Reads global cart state via selectors
- Dispatches actions (increase/decrease/remove)
- Conditional rendering for empty state

Why used
- Cart is shared between list/detail/checkout, so Redux is the simplest “single source of truth”.

TypeScript concepts used
- Selector typing and action payload typing (through Redux Toolkit)

Hasura + persistence used (behind the scenes)
- Cart is synced by listener middleware (`cartListener.ts`) using Hasura mutations; falls back to IndexedDB on failure.

### Page: `/checkout` (Multi-step checkout + order create + Stripe)
Main file: `internship-frontend/src/features/products/CheckoutPage.tsx`

React concepts used
- Multi-step UI controlled by a union state:
  - `step: "address" | "payment" | "review" | "stripe"`
- `useEffect` for async pincode validation + auto-fill with debounce-like timeout
- `useMemo` for derived options (city/state lists) and Stripe appearance settings
- Controlled form inputs + submit handlers

Why used
- Step union keeps the flow explicit and prevents illegal steps.
- Zod validation prevents invalid order payloads from reaching backend actions.
- Stripe Elements is isolated to a dedicated step to keep payment logic separate.

TypeScript concepts used
- Literal unions for payment method: `"cod" | "card"`
- Typed checkout shapes: `CheckoutAddress`
- “unknown-safe” error message helpers (defensive narrowing)

Hasura actions used
- `createOrder` (creates order + items + address + clears cart server-side)
- `createStripePaymentIntent` (for card payments only)

### Page: `/order-success` (Success summary + resend email)
Main file: `internship-frontend/src/features/products/OrderSuccessPage.tsx`

React concepts used
- Uses router state (`location.state.orderData`) instead of re-fetching immediately
- `useRef` to avoid duplicate success toast on re-render
- `useMemo` for derived expected delivery date

Why used
- Avoids extra load and shows confirmation immediately after checkout.

TypeScript concepts used
- Flexible shapes for navigation state (`Record<string, unknown>`) with safe coercions
- `satisfies` operator to keep object typing without widening

Hasura action used
- `invokeEmailLambda` (resend confirmation email)

### Page: `/orders` (Order history — real-time)
Main file: `internship-frontend/src/features/products/OrderHistoryPage.tsx`

React concepts used
- WebSocket subscription lifecycle via `useHasuraSubscription`
- `useCallback` to keep a stable subscribe function reference
- Pagination for UI

Why used
- Orders update in real-time (status changes) without manual refresh.

TypeScript concepts used
- Mapped styling record: `Record<string, string>` for status → CSS class

Hasura used
- Hasura **subscription**: `orders(order_by: { created_at: desc })`
- Payment status enrichment via Hasura **action**: `getPaymentStatus` (only when needed)

### Page: `/orders/:orderId` (Order detail — real-time)
Main file: `internship-frontend/src/features/products/OrderDetailPage.tsx`

React concepts used
- Param parsing + validation before subscription
- WebSocket subscription to a single order record + related items/address

Why used
- Real-time detail view as order moves through workflow states.

TypeScript concepts used
- Typed “payload” composition:
  - `OrderSummary`, `OrderItem[]`, `ShippingAddress | null`

Hasura used
- Hasura **subscription**: `orders(where: { order_id: { _eq: $orderId } })` including relationships

---

## “Why these concepts” (short summary)

- **React Router + lazy/Suspense**: page-level code splitting and better perceived performance.
- **Redux Toolkit**: consistent global state for auth/cart/todos and predictable updates.
- **Listener middleware**: clean side-effect handling (cart sync + persistence) without coupling to UI components.
- **Zod**: runtime input validation (forms + route params) to protect backend and keep UX predictable.
- **Apollo + Hasura wrapper**: centralized authentication headers, retry logic, and consistent data access.
- **WebSocket subscriptions**: live order updates without polling.
- **TypeScript**: safer refactors, typed payloads, and fewer runtime bugs in integration points (GraphQL, Stripe, Firebase).
