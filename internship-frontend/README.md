# Internship Frontend

Last updated: 2026-03-14

## Stack

- React + TypeScript + Vite
- Redux Toolkit
- Apollo Client + GraphQL
- Firebase Auth
- Stripe Elements

## App Responsibilities

- Authenticate users with Firebase and exchange token via Hasura action.
- Handle OAuth edge case (Google/GitHub same email) via account-linking flow.
- Query/mutate Hasura tables for products/cart/orders.
- Trigger backend actions for order creation, payment intent, payment status, and email notifications.
- Subscribe to realtime order updates.

## Important Paths

- App bootstrap: `src/main.tsx`
- Router: `src/app/router/appRouter.tsx`
- Auth listener: `src/features/auth/authListener.ts`
- Commerce API barrel: `src/features/products/hasuraCommerce.ts`
- Commerce modules:
  - `src/features/products/hasuraCommerce/products.ts`
  - `src/features/products/hasuraCommerce/cart.ts`
  - `src/features/products/hasuraCommerce/orders.ts`
  - `src/features/products/hasuraCommerce/payments.ts`
  - `src/features/products/hasuraCommerce/notifications.ts`

## Scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run storybook
```

## Environment Variables

Typical variables used by the frontend:

- `VITE_HASURA_URL`
- `VITE_STRIPE_PUBLISHABLE_KEY`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`

## Local Run

```bash
npm install
npm run dev
```

Frontend expects backend/Hasura services to be running and reachable.

When the frontend is served over `https`, configure `VITE_HASURA_URL` with an `https` URL in production.

## Auth Token Notes

- Backend `authLogin` returns both `token` (backend JWT) and `hasuraToken` (Hasura JWT).
- Frontend uses a single persisted token for Hasura requests: `localStorage["jwt"] = hasuraToken`.

## OAuth Linking Notes

If a user tries to sign in with Google/GitHub using an email that already exists under another provider, Firebase throws `auth/account-exists-with-different-credential`. The login page:

1. Calls `fetchSignInMethodsForEmail(email)` to determine the existing method.
2. Prompts the user to sign in with that existing method.
3. After successful sign-in, links the pending credential via `linkWithCredential`.
4. Temporarily stores the pending credential tokens in `sessionStorage["pending_oauth_link"]` for redirect/reload resilience.
