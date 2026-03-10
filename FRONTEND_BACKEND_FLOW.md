# Frontend to Backend Flow (Feature-wise)

Last updated: 2026-03-09

## 1. Authentication

Frontend:

1. `startAuthListener()` runs on app boot.
2. User signs in through Firebase.
3. Frontend sends `authLogin(firebaseIdToken)` through Hasura GraphQL.
4. Returned token is stored and set for Hasura HTTP/WS calls.

Files:

- `internship-frontend/src/main.tsx`
- `internship-frontend/src/features/auth/authListener.ts`
- `internship-frontend/src/features/auth/Login.tsx`
- `internship-frontend/src/features/auth/Signup.tsx`

Backend/Hasura:

1. Hasura action route forwards to backend.
2. Backend verifies Firebase token and upserts user.
3. Backend returns unified JWT token.

Files:

- `internship-backend/src/routes/hasura.ts`
- `internship-backend/src/controllers/hasura/authLogin.action.ts`
- `internship-backend/src/services/hasura/auth.service.ts`
- `internship-backend/src/shared/auth/hasuraToken.ts`

## 2. Product Browsing

Frontend:

- Product queries: `internship-frontend/src/features/products/hasuraCommerce/products.ts`
- Pages: `internship-frontend/src/features/products/ProductsPage.tsx`, `internship-frontend/src/features/products/ProductDetailPage.tsx`

Backend path:

- No Express action; Hasura queries `products` directly.

## 3. Cart Sync

Frontend:

1. Redux cart changes in `cartSlice.ts`.
2. `cartListener.ts` syncs to Hasura for authenticated users.
3. On sync failure, fallback to IndexedDB.

Files:

- `internship-frontend/src/features/products/cartSlice.ts`
- `internship-frontend/src/features/products/cartListener.ts`
- `internship-frontend/src/features/products/hasuraCommerce/cart.ts`
- `internship-frontend/src/utils/indexedDb.ts`

Backend path:

- Hasura direct table operations on `cart_items`.

## 4. Checkout: Create Order

Frontend:

1. User submits checkout in `CheckoutPage.tsx`.
2. Frontend calls `createOrderViaAction()`.

Backend:

1. `/hasura/actions/create-order` validates session and payload.
2. Service validates stock/idempotency and writes order graph.
3. Cancels stale pending attempts when required.

Files:

- `internship-frontend/src/features/products/CheckoutPage.tsx`
- `internship-frontend/src/features/products/hasuraCommerce/orders.ts`
- `internship-backend/src/controllers/hasura/createOrder.action.ts`
- `internship-backend/src/services/hasura/order.service.ts`
- `internship-backend/src/models/order.model.ts`
- `internship-backend/src/models/inventory.model.ts`

## 5. Payment

### Card payment

Frontend:

1. Calls `createStripePaymentIntentViaAction()`.
2. Confirms payment in `StripePaymentForm.tsx`.
3. Polls status using `getPaymentStatus` action.

Backend:

1. Creates/reuses Stripe intent and updates `payments`.
2. Stripe webhook updates status and signals workflow.

Files:

- `internship-backend/src/controllers/hasura/createStripePaymentIntent.action.ts`
- `internship-backend/src/services/hasura/payment.service.ts`
- `internship-backend/src/middleware/stripeWebhook.ts`
- `internship-backend/src/controllers/payment.controller.ts`
- `internship-backend/src/services/payments/webhook.service.ts`

### COD payment

- Follows order path; Temporal finalizes payment/order state.

## 6. Hasura Event to Temporal

1. New order insert triggers Hasura event.
2. Backend event controller starts workflow `order-{orderId}`.

Files:

- `internship-backend/hasura/metadata/databases/default/tables/public_orders.yaml`
- `internship-backend/src/controllers/hasura/orderInserted.event.ts`
- `internship-backend/src/services/hasura/event.service.ts`
- `internship-backend/src/temporal/client.ts`

## 7. Workflow Execution

Workflow/activities:

- `internship-backend/src/temporal/workflows/orderPlacement.ts`
- `internship-backend/src/temporal/workflows/inventoryRelease.ts`
- `internship-backend/src/temporal/workflows/paymentRetry.ts`
- `internship-backend/src/temporal/activities/order.activities.ts`
- `internship-backend/src/temporal/activities/inventory.activities.ts`
- `internship-backend/src/temporal/activities/lambda.activities.ts`

Behavior:

1. Reserve inventory.
2. Wait for payment outcome.
3. Confirm order/inventory on success.
4. Roll back and release on failure/timeout.

## 8. Realtime Orders

Frontend pages subscribe to Hasura and optionally enrich payment status.

Files:

- `internship-frontend/src/features/products/OrderHistoryPage.tsx`
- `internship-frontend/src/features/products/OrderDetailPage.tsx`
- `internship-frontend/src/hooks/useHasuraSubscription.ts`
- `internship-frontend/src/features/products/hasuraCommerce/orders.ts`

## 9. Scheduled Jobs and Cleanup

- Idempotency cleanup cron in `internship-backend/src/index.ts`
- Cleanup model: `internship-backend/src/models/checkoutIdempotency.model.ts`
- Inventory cleanup Temporal schedule hook: `internship-backend/src/temporal/client.ts`
