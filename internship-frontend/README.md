# Internship Frontend

Last updated: 2026-03-09

## Stack

- React + TypeScript + Vite
- Redux Toolkit
- Apollo Client + GraphQL
- Firebase Auth
- Stripe Elements

## App Responsibilities

- Authenticate users with Firebase and exchange token via Hasura action.
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
