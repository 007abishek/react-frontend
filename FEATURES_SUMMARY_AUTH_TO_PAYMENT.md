# Features Summary: Authentication → Payment

Last updated: 2026-03-14

This document summarizes the end-to-end flow for the core commerce journey, from user authentication through checkout and payment, and points to the main implementation files.

## 1) Authentication (Firebase → Hasura JWT)

### User-facing capabilities

- Email/password login
- Google OAuth login (popup on desktop, redirect on mobile)
- GitHub OAuth login (popup)
- Guest login (anonymous)

### Key flow

1. User signs in with Firebase on the login/signup pages.
2. `onAuthStateChanged` runs and exchanges the Firebase ID token via Hasura action `authLogin`.
3. Backend verifies the Firebase token, upserts the user, and returns:
   - `hasuraToken` (Hasura session JWT)
   - `token` (backend JWT; currently not persisted/used by the frontend)
4. Frontend stores a single persisted token for Hasura requests:
   - `localStorage["jwt"] = hasuraToken`
5. Apollo attaches `Authorization: Bearer <jwt>` to Hasura GraphQL requests.

### OAuth edge case: same email across providers (Google/GitHub)

If Firebase throws `auth/account-exists-with-different-credential`:

1. Frontend calls `fetchSignInMethodsForEmail(email)` to determine the existing sign-in method.
2. Frontend prompts the user to sign in using that existing method.
3. After successful sign-in, frontend links accounts using `linkWithCredential(currentUser, pendingCredential)`.
4. Pending credential material is stored temporarily in `sessionStorage["pending_oauth_link"]` for redirect/reload resilience.

### Email verification gate (password accounts)

- Backend returns `user.emailVerified`.
- If `emailVerified` is false for password logins, frontend signs out and sets `localStorage["pending_otp_verification_email"]` so the login page can show the “verify OTP” message.

### Primary files

- Login UI + OAuth linking: `internship-frontend/src/features/auth/Login.tsx`
- Signup flow: `internship-frontend/src/features/auth/Signup.tsx`
- Auth listener + token exchange: `internship-frontend/src/features/auth/authListener.ts`
- Token persistence/helpers: `internship-frontend/src/utils/hasuraClient.ts`, `internship-frontend/src/utils/apolloClient.ts`
- Firebase setup: `internship-frontend/src/firebase/config.ts`
- Backend action handler: `internship-backend/src/controllers/hasura/authLogin.action.ts`
- Backend auth service (user upsert + tokens): `internship-backend/src/services/hasura/auth.service.ts`
- Hasura JWT signing: `internship-backend/src/shared/auth/hasuraToken.ts`

## 2) Products (Browse + Details)

### User-facing capabilities

- Browse products list
- View product details

### Key flow

- Frontend queries Hasura tables directly for product data (no backend Express action required).

### Primary files

- Product pages: `internship-frontend/src/features/products/ProductsPage.tsx`, `internship-frontend/src/features/products/ProductDetailPage.tsx`
- GraphQL helpers: `internship-frontend/src/features/products/hasuraCommerce/products.ts`
- Hasura client wrapper: `internship-frontend/src/utils/hasuraClient.ts`

## 3) Cart (Hasura sync + IndexedDB fallback)

### User-facing capabilities

- Add/update/remove cart items
- Persist cart across refreshes

### Key flow

- Logged-in users: cart mutations go to Hasura (`cart_items`) and are scoped by session claims.
- If Hasura sync fails, frontend falls back to IndexedDB and later attempts to sync.

### Primary files

- Redux cart state: `internship-frontend/src/features/products/cartSlice.ts`
- Cart UI: `internship-frontend/src/features/products/CartPage.tsx`
- Cart sync: `internship-frontend/src/features/products/cartListener.ts`
- Cart GraphQL: `internship-frontend/src/features/products/hasuraCommerce/cart.ts`
- IndexedDB fallback: `internship-frontend/src/utils/indexedDb.ts`

## 4) Checkout (Create Order)

### User-facing capabilities

- Enter shipping details
- Choose payment method (COD or card)
- Place order

### Key flow

1. Frontend generates/reuses a stable attempt order ID (`ORD-*`).
2. Frontend calls Hasura action `createOrder`.
3. Backend validates session + inputs, checks inventory/idempotency, writes the order graph in a transaction, and clears the cart.

### Primary files

- Checkout UI: `internship-frontend/src/features/products/CheckoutPage.tsx`
- Order GraphQL: `internship-frontend/src/features/products/hasuraCommerce/orders.ts`
- Backend controller: `internship-backend/src/controllers/hasura/createOrder.action.ts`
- Backend service: `internship-backend/src/services/hasura/order.service.ts`
- Order/idempotency models: `internship-backend/src/models/order.model.ts`, `internship-backend/src/models/checkoutIdempotency.model.ts`

## 5) Payment (Stripe Card + Webhook + Status)

### User-facing capabilities

- Card payment via Stripe Elements
- Payment status display and reconciliation

### Key flow (card)

1. Frontend calls Hasura action `createStripePaymentIntent`.
2. Backend creates/reuses a Stripe PaymentIntent and returns `clientSecret`.
3. Frontend confirms payment with Stripe Elements.
4. Stripe sends webhook to backend; backend updates `payments` and signals the order workflow.
5. Frontend can query `getPaymentStatus` to reconcile UI state.

### Primary files

- Stripe UI: `internship-frontend/src/features/products/StripePaymentForm.tsx`
- Payments GraphQL: `internship-frontend/src/features/products/hasuraCommerce/payments.ts`
- Backend intent action: `internship-backend/src/controllers/hasura/createStripePaymentIntent.action.ts`
- Backend payment status action: `internship-backend/src/controllers/hasura/getPaymentStatus.action.ts`
- Backend Stripe webhook: `internship-backend/src/controllers/payment.controller.ts`
- Backend payment service: `internship-backend/src/services/hasura/payment.service.ts`, `internship-backend/src/services/payments/webhook.service.ts`
- Webhook middleware: `internship-backend/src/middleware/stripeWebhook.ts`

## 6) Reference Diagrams / Deeper Docs

- Sequence diagrams: `SEQUENCE_DIAGRAMS.md`
- Feature → file map: `FEATURE_TO_FILE_MAP.md`
- Frontend ↔ backend flow: `FRONTEND_BACKEND_FLOW.md`
- Contracts/inputs/outputs: `PROJECT_FEATURE_DATA_CONTRACTS.md`

