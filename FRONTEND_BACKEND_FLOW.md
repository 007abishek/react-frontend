# Frontend to Backend Flow (Feature-wise)

This document explains the temporal flow of the app, from user authentication to order lifecycle, with responsible files for frontend, backend, Hasura, DB, Stripe, and Temporal.

## 1. Authentication

### Frontend flow
1. App starts and auth listener is attached.
   - `internship-frontend/src/main.tsx`
   - `internship-frontend/src/features/auth/authListener.ts`
2. User logs in via Firebase (email/password, Google, GitHub, guest).
   - `internship-frontend/src/features/auth/Login.tsx`
   - `internship-frontend/src/features/auth/Signup.tsx`
   - `internship-frontend/src/firebase/config.ts`
3. Listener gets Firebase ID token and calls Hasura action `authLogin`.
   - `internship-frontend/src/features/auth/authListener.ts`
4. Frontend stores:
   - unified JWT in `localStorage.jwt` (used for both app auth and Hasura auth)
5. Protected routes unlock after auth state resolves.
   - `internship-frontend/src/components/ProtectedRoute.tsx`
   - `internship-frontend/src/app/router/modules/productRoutes.tsx`

### Backend/Hasura flow
1. Hasura action endpoint receives action request.
   - `internship-backend/src/routes/hasura.ts`
   - `internship-backend/src/controllers/hasura/authLogin.action.ts`
2. Firebase token is verified, user is upserted in `users`, and one unified JWT is issued.
   - `internship-backend/src/services/hasura/auth.service.ts`
   - `internship-backend/src/shared/auth/hasuraToken.ts`
3. Same JWT contains Hasura session claims (`x-hasura-user-id`, etc.) and app-level claims.
   - `internship-backend/src/shared/auth/hasuraToken.ts`

### DB tables touched
- `users`

### Hasura metadata
- Actions metadata snapshot:
  - `internship-backend/hasura-metadata.json` (`authLogin`; `issueHasuraToken` kept for compatibility)
- Users permission:
  - `internship-backend/hasura/metadata/databases/default/tables/public_users.yaml`

## 2. Products (List)

### Frontend flow
1. User opens `/products`.
   - `internship-frontend/src/features/products/ProductsPage.tsx`
2. Frontend fetches product list from Hasura GraphQL.
   - `internship-frontend/src/features/products/hasuraCommerce/products.ts`
   - `internship-frontend/src/utils/hasuraClient.ts`

### Backend/Hasura flow
1. No backend Express action used for product list.
2. Hasura directly queries Postgres `products`.

### DB tables touched
- `products` (read)

### Hasura metadata
- `internship-backend/hasura/metadata/databases/default/tables/public_products.yaml`

## 3. Product Detail

### Frontend flow
1. User opens `/product/:id`.
   - `internship-frontend/src/features/products/ProductDetailPage.tsx`
2. Frontend fetches `products_by_pk`.
   - `internship-frontend/src/features/products/hasuraCommerce/products.ts`

### Backend/Hasura flow
1. Hasura direct table query by primary key.

### DB tables touched
- `products` (read)

## 4. Cart

### Frontend flow
1. Add/update/remove cart items in Redux.
   - `internship-frontend/src/features/products/cartSlice.ts`
   - `internship-frontend/src/features/products/CartPage.tsx`
2. Listener syncs cart to Hasura for logged-in users.
   - `internship-frontend/src/features/products/cartListener.ts`
   - `internship-frontend/src/features/products/hasuraCommerce/cart.ts`
3. If sync fails, fallback to IndexedDB.
   - `internship-frontend/src/utils/indexedDb.ts`

### Backend/Hasura flow
1. Hasura direct mutations/queries on `cart_items`.
2. Row-level security scopes operations to current user ID.

### DB tables touched
- `cart_items`

### Hasura metadata
- `internship-backend/hasura/metadata/databases/default/tables/public_cart_items.yaml`

## 5. Checkout and Create Order

### Frontend flow
1. User completes address -> payment -> review steps.
   - `internship-frontend/src/features/products/CheckoutPage.tsx`
2. Frontend generates/reuses stable attempt order ID (`ORD-*`) and calls `createOrder` action.
   - `internship-frontend/src/features/products/hasuraCommerce/orders.ts`
3. Payload includes items, shipping address, payment method, totals.

### Backend/Hasura flow
1. Hasura action route and controller validate Hasura session.
   - `internship-backend/src/routes/hasura.ts`
   - `internship-backend/src/controllers/hasura/createOrder.action.ts`
2. Service validates products, quantities, stock, idempotency window.
   - `internship-backend/src/services/hasura/order.service.ts`
3. Transactional writes:
   - create `orders`
   - create `order_items`
   - create `shipping_addresses`
   - upsert `checkout_idempotency`
   - clear `cart_items`
4. Existing pending orders for same user may be cancelled, and older Temporal workflows are cancelled.
   - `internship-backend/src/services/hasura/order.service.ts`
   - `internship-backend/src/temporal/client.ts`

### DB tables touched
- `orders`
- `order_items`
- `shipping_addresses`
- `checkout_idempotency`
- `cart_items`
- `payments` (when cancelling stale pending flows)
- `inventory_reservations` (when cancelling stale pending flows)

### Hasura metadata
- Action metadata snapshot:
  - `internship-backend/hasura-metadata.json` (`createOrder`)
- Orders table trigger:
  - `internship-backend/hasura/metadata/databases/default/tables/public_orders.yaml`

## 6. Payment (COD and Card)

### 6.1 COD path
1. After order creation, frontend navigates toward success flow.
2. Temporal workflow finalizes status and marks payment succeeded for COD.
   - `internship-backend/src/temporal/workflows/orderPlacement.ts`

### 6.2 Card path (Stripe)

#### Frontend flow
1. Frontend calls `createStripePaymentIntent` action.
   - `internship-frontend/src/features/products/hasuraCommerce/orders.ts`
2. Stripe Elements confirms payment using `clientSecret`.
   - `internship-frontend/src/features/products/StripePaymentForm.tsx`
3. Frontend polls backend payment status/order confirmation.
   - `internship-frontend/src/features/products/hasuraCommerce/orders.ts`

#### Backend/Hasura flow
1. Action route/controller/service for intent creation.
   - `internship-backend/src/controllers/hasura/createStripePaymentIntent.action.ts`
   - `internship-backend/src/services/hasura/payment.service.ts`
2. Service reuses existing valid intent when possible, otherwise creates new Stripe PaymentIntent with idempotency key.
3. Payment record persisted/updated in `payments`.

#### Stripe webhook flow
1. Stripe posts webhook event to backend endpoint.
   - `internship-backend/src/index.ts`
   - `internship-backend/src/middleware/stripeWebhook.ts`
   - `internship-backend/src/controllers/payment.controller.ts`
   - `internship-backend/src/services/payments/webhook.service.ts`
2. On `payment_intent.succeeded`:
   - update `payments` status
   - signal Temporal workflow `paymentCompleted`
3. On failure/cancel events:
   - update payment/order states
   - release inventory reservations if needed

### DB tables touched
- `payments`
- `orders`
- `inventory_reservations`

### Hasura metadata
- Action metadata snapshot:
  - `internship-backend/hasura-metadata.json` (`createStripePaymentIntent`, `getPaymentStatus`)
- Payments permissions:
  - `internship-backend/hasura/metadata/databases/default/tables/public_payments.yaml`

## 7. Hasura Event -> Temporal Workflow

### Event trigger flow
1. On `orders` insert, Hasura event trigger calls backend webhook.
   - `internship-backend/hasura/metadata/databases/default/tables/public_orders.yaml`
2. Backend validates event secret and extracts `order_id`.
   - `internship-backend/src/middleware/hasura.ts`
   - `internship-backend/src/controllers/hasura/helpers.ts`
   - `internship-backend/src/controllers/hasura/orderInserted.event.ts`
3. Backend reads full order graph and starts Temporal workflow idempotently.
   - `internship-backend/src/services/hasura/event.service.ts`
   - `internship-backend/src/models/order.model.ts`
   - `internship-backend/src/temporal/client.ts`

## 8. Temporal Workflow (Order Lifecycle Engine)

### Runtime files
- Workflow:
  - `internship-backend/src/temporal/workflows/orderPlacement.ts`
- Child workflows:
  - `internship-backend/src/temporal/workflows/inventoryRelease.ts`
  - `internship-backend/src/temporal/workflows/inventoryCleanupSweep.ts`
  - `internship-backend/src/temporal/workflows/paymentRetry.ts`
- Activities:
  - `internship-backend/src/temporal/activities/order.activities.ts`
  - `internship-backend/src/temporal/activities/inventory.activities.ts`
  - `internship-backend/src/temporal/activities/lambda.activities.ts`
- Worker:
  - `internship-backend/src/temporal/worker.ts`

### Behavior
1. Validate inventory.
2. Reserve inventory with timeout release safety net.
3. Ensure order/payment records are ready.
4. Wait for card payment signal or auto-pass COD.
5. Confirm order and inventory on success.
6. Rollback order, cancel payment, release inventory on timeout/failure.
7. Send confirmation/failure email via Lambda activity.

## 9. Order History and Order Detail (Realtime)

### Frontend flow
1. User opens `/orders` or `/orders/:orderId`.
   - `internship-frontend/src/features/products/OrderHistoryPage.tsx`
   - `internship-frontend/src/features/products/OrderDetailPage.tsx`
2. Frontend subscribes to Hasura GraphQL WS and enriches payment status.
   - `internship-frontend/src/features/products/hasuraCommerce/orders.ts`
   - `internship-frontend/src/hooks/useHasuraSubscription.ts`

### Backend/Hasura flow
1. Hasura streams `orders`, `order_items`, `shipping_addresses` for current user role.
2. Optional backend action `getPaymentStatus` is used for status reconciliation with Temporal terminal states.
   - `internship-backend/src/controllers/hasura/getPaymentStatus.action.ts`
   - `internship-backend/src/services/hasura/payment.service.ts`

## 10. Security and Secrets (Action/Event Boundary)

### Middleware and helpers
- `internship-backend/src/middleware/hasura.ts`
- `internship-backend/src/controllers/hasura/helpers.ts`

### Guarding rules
1. Hasura Actions require `x-hasura-action-secret` when configured.
2. Hasura Events require `x-hasura-event-secret` when configured.
3. Mutating actions requiring user context extract `x-hasura-user-id` and `x-hasura-firebase-uid` from Hasura session variables.

## 11. Startup and Scheduled Jobs

### Backend boot sequence
1. Initialize DB.
2. Register Hasura routes and Stripe webhook endpoints.
3. Ensure inventory cleanup Temporal cron.
4. Start idempotency cleanup cron (every 10 min).

Responsible files:
- `internship-backend/src/index.ts`
- `internship-backend/src/models/checkoutIdempotency.model.ts`

---

## Quick Reference: End-to-End Timeline

1. `Login` -> Firebase token -> Hasura `authLogin` action -> unified JWT issued.
2. `Products/Product detail` -> Hasura table queries.
3. `Cart` -> Hasura `cart_items` sync (IndexedDB fallback).
4. `Checkout` -> Hasura `createOrder` action -> DB transaction.
5. `Order insert` -> Hasura event trigger -> Temporal workflow starts.
6. `Card` -> Hasura `createStripePaymentIntent` action -> Stripe confirm -> webhook -> workflow signal.
7. `Workflow` -> confirms or rolls back order/inventory/payment.
8. `Order history/detail` -> Hasura subscriptions + payment status reconciliation.
