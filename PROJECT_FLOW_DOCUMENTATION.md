# Talview Internship Project Flow Documentation

Last updated: 2026-03-14

## 1. System Overview

- Frontend app: `internship-frontend` (React + Redux + Apollo + Stripe Elements + Firebase)
- Backend app: `internship-backend` (Express + Hasura action/event handlers + Knex + Stripe + Temporal)
- GraphQL runtime: Hasura over PostgreSQL

Primary request paths:

1. Frontend table reads/writes go to Hasura GraphQL.
2. Hasura actions call backend endpoints at `/hasura/actions/*`.
3. Hasura event trigger calls backend endpoint at `/hasura/events/order-inserted`.
4. Backend starts/coordinates Temporal workflows and Stripe webhooks.

## 2. Auth Flow

Frontend files:

- `internship-frontend/src/features/auth/Login.tsx`
- `internship-frontend/src/features/auth/Signup.tsx`
- `internship-frontend/src/features/auth/authListener.ts`

Backend files:

- `internship-backend/src/controllers/hasura/authLogin.action.ts`
- `internship-backend/src/services/hasura/auth.service.ts`
- `internship-backend/src/shared/auth/hasuraToken.ts`

Flow:

1. Firebase login completes in frontend.
2. Frontend sends `authLogin(firebaseIdToken)` to Hasura.
3. Hasura action hits backend `/hasura/actions/auth-login`.
4. Backend verifies Firebase token, upserts `users`, returns:
   - `hasuraToken` (used for Hasura auth)
   - `token` (backend JWT, currently not used by frontend)
5. Frontend stores `hasuraToken` in `localStorage["jwt"]` and uses it for Hasura requests.
6. OAuth edge case: Google/GitHub same email linking is handled in `Login.tsx` using `fetchSignInMethodsForEmail` + `linkWithCredential`.

## 3. Products and Cart

Products:

- Frontend product methods: `internship-frontend/src/features/products/hasuraCommerce/products.ts`
- Hasura table metadata: `internship-backend/hasura/metadata/databases/default/tables/public_products.yaml`

Cart:

- Frontend cart state: `internship-frontend/src/features/products/cartSlice.ts`
- Sync middleware: `internship-frontend/src/features/products/cartListener.ts`
- Hasura cart methods: `internship-frontend/src/features/products/hasuraCommerce/cart.ts`
- IndexedDB fallback: `internship-frontend/src/utils/indexedDb.ts`
- Hasura cart metadata: `internship-backend/hasura/metadata/databases/default/tables/public_cart_items.yaml`

## 4. Checkout and Order Creation

Frontend:

- Checkout page: `internship-frontend/src/features/products/CheckoutPage.tsx`
- Order methods: `internship-frontend/src/features/products/hasuraCommerce/orders.ts`

Backend:

- Action controller: `internship-backend/src/controllers/hasura/createOrder.action.ts`
- Service: `internship-backend/src/services/hasura/order.service.ts`
- Models: `internship-backend/src/models/order.model.ts`, `internship-backend/src/models/inventory.model.ts`

What backend does in transaction:

1. Validate session and input.
2. Validate products/quantities/stock.
3. Handle idempotency using `checkout_idempotency`.
4. Cancel stale pending orders and related pending payments/reservations.
5. Insert `orders`, `order_items`, `shipping_addresses`.
6. Clear `cart_items`.

Cleanup:

- Expired idempotency cleanup model: `internship-backend/src/models/checkoutIdempotency.model.ts`
- Cron scheduler: `internship-backend/src/index.ts`

## 5. Payment Flow

Card payment path:

- Action controller: `internship-backend/src/controllers/hasura/createStripePaymentIntent.action.ts`
- Service: `internship-backend/src/services/hasura/payment.service.ts`
- Frontend form: `internship-frontend/src/features/products/StripePaymentForm.tsx`

Behavior:

1. Frontend calls create intent action.
2. Backend validates ownership/amount, reuses or creates Stripe intent, persists `payments`.
3. Frontend confirms card with Stripe Elements.
4. Frontend polls status with `getPaymentStatus` action.

COD path:

- Order starts as pending.
- Temporal workflow marks final state.

## 6. Hasura Event and Temporal Workflow

Event trigger source:

- `internship-backend/hasura/metadata/databases/default/tables/public_orders.yaml`

Backend event handling:

- Controller: `internship-backend/src/controllers/hasura/orderInserted.event.ts`
- Service: `internship-backend/src/services/hasura/event.service.ts`

Workflow files:

- `internship-backend/src/temporal/workflows/orderPlacement.ts`
- `internship-backend/src/temporal/workflows/inventoryRelease.ts`
- `internship-backend/src/temporal/workflows/inventoryCleanupSweep.ts`
- `internship-backend/src/temporal/workflows/paymentRetry.ts`

Main responsibilities:

1. Reserve inventory.
2. Wait for payment signal (or auto path for COD).
3. Confirm inventory and order on success.
4. Cancel/release on timeout/failure.
5. Trigger email notifications via Lambda activity.

## 7. Stripe Webhook

Files:

- Middleware: `internship-backend/src/middleware/stripeWebhook.ts`
- Controller: `internship-backend/src/controllers/payment.controller.ts`
- Service: `internship-backend/src/services/payments/webhook.service.ts`
- HTTP wiring: `internship-backend/src/index.ts`

Endpoints:

- `POST /payments/stripe/webhook`
- `POST /payments/stripe` (backward compatible)

## 8. Current Model Structure (Old Structure, Valid)

Current project keeps these main backend models:

- `internship-backend/src/models/inventory.model.ts`
- `internship-backend/src/models/order.model.ts`
- `internship-backend/src/models/payment.model.ts`
- `internship-backend/src/models/checkoutIdempotency.model.ts`

This structure is feature-oriented and sufficient for current scope.

## 9. Core Backend Middleware

- `internship-backend/src/middleware/hasura.ts`:
  - action/event secret checks
  - Hasura session attachment
- `internship-backend/src/middleware/stripeWebhook.ts`:
  - Stripe signature verification

## 10. Related Documentation Index

- `FEATURE_TO_FILE_MAP.md`
- `FRONTEND_BACKEND_FLOW.md`
- `SEQUENCE_DIAGRAMS.md`
