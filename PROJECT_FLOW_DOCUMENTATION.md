# Talview Internship Project - End-to-End Documentation

## 1. System Overview

This project is split into two apps:

- `internship-frontend` (React + Redux + Apollo + Stripe Elements + Firebase Auth)
- `internship-backend` (Express + Hasura Action/Event handlers + PostgreSQL models + Stripe webhook + Temporal workflows)

Primary data API path is:

1. Frontend calls Hasura GraphQL (`/v1/graphql`) using Apollo client.
2. Hasura resolves:
   - direct table queries/mutations (products, cart, orders, etc.)
   - custom actions routed to backend Express (`/hasura/actions/*`)
3. Hasura event triggers call backend Express (`/hasura/events/*`) for async workflow start.
4. Backend uses DB models + Temporal + Stripe + Lambda as needed.

## 2. High-Level User Journey

### 2.1 App boot and route protection

- App providers are wired in `internship-frontend/src/main.tsx`:
  - `ApolloProvider` (GraphQL)
  - Redux `Provider`
  - `BrowserRouter`
  - Stripe `Elements`
  - Sentry boundary
- Routes are defined in `internship-frontend/src/App.tsx`.
- All major app routes are protected with `ProtectedRoute` (`internship-frontend/src/components/ProtectedRoute.tsx`).

### 2.2 Authentication (Signup/Login)

UI files:

- Signup page: `internship-frontend/src/features/auth/Signup.tsx`
- Login page: `internship-frontend/src/features/auth/Login.tsx`
- Auth state slice: `internship-frontend/src/features/auth/authSlice.ts`
- Auth listener: `internship-frontend/src/features/auth/authListener.ts`
- Firebase setup: `internship-frontend/src/firebase/config.ts`

Flow:

1. User signs up via Firebase email/password in `Signup.tsx`.
2. Verification email is sent; user is signed out until verified.
3. User logs in via email/password, Google, GitHub, or guest in `Login.tsx`.
4. `startAuthListener()` in `authListener.ts` listens to Firebase session changes.
5. On authenticated user, frontend sends Hasura mutation `authLogin(firebaseIdToken)` to exchange Firebase token for:
   - backend JWT (`jwt` in localStorage)
   - Hasura JWT (`hasura_jwt` in localStorage)
6. Auth state is set (`loginSuccess`), then cart is loaded from Hasura; fallback to IndexedDB.

Backend files used by auth actions:

- Route registration: `internship-backend/src/routes/hasura.ts`
- Controller: `internship-backend/src/controllers/hasura/authLogin.action.ts`
- Controller: `internship-backend/src/controllers/hasura/issueHasuraToken.action.ts`
- Service: `internship-backend/src/services/hasura/auth.service.ts`
- Hasura JWT claims signer: `internship-backend/src/shared/auth/hasuraToken.ts`

Hasura action metadata (exported):

- `internship-backend/hasura-metadata.json`
  - `authLogin` -> `/hasura/actions/auth-login`
  - `issueHasuraToken` -> `/hasura/actions/issue-hasura-token`

## 3. Product Browsing Feature

UI files:

- Product list: `internship-frontend/src/features/products/ProductsPage.tsx`
- Product detail: `internship-frontend/src/features/products/ProductDetailPage.tsx`
- RTK Query wrapper: `internship-frontend/src/features/products/productApi.ts`
- Hasura commerce layer: `internship-frontend/src/features/products/hasuraCommerce.ts`

Flow:

1. Products page uses `useGetProductsQuery()` from `productApi.ts`.
2. `productApi.ts` calls `fetchProducts()` in `hasuraCommerce.ts`.
3. `hasuraCommerce.ts` runs GraphQL query via `hasuraRequest()`.
4. `hasuraRequest()` (in `internship-frontend/src/utils/hasuraClient.ts`) uses Apollo client and Bearer Hasura JWT.
5. Product detail route `/product/:id` fetches item via `fetchProductById()`.

Hasura table permissions involved:

- Products metadata: `internship-backend/hasura/metadata/databases/default/tables/public_products.yaml`
- Both `user` and `guest` roles can select products.

## 4. Cart Feature

UI/state files:

- Cart state and reducers: `internship-frontend/src/features/products/cartSlice.ts`
- Cart selectors: `internship-frontend/src/features/products/cartSelectors.ts`
- Cart UI page: `internship-frontend/src/features/products/CartPage.tsx`
- Cart listener middleware: `internship-frontend/src/features/products/cartListener.ts`
- Redux store wiring: `internship-frontend/src/app/store.ts`

Flow:

1. Add to cart from product list/detail dispatches `addToCart`.
2. Cart page shows items, quantity changes, remove actions.
3. `cartListener.ts` observes cart state changes.
4. For logged-in non-guest users:
   - first tries syncing cart to Hasura (`syncCart()`)
   - on failure, falls back to IndexedDB (`saveCartForUser()`)
5. On login, listener loads cart from Hasura first (`fetchCart()`), then IndexedDB fallback.

Persistence and Hasura integration files:

- IndexedDB utility: `internship-frontend/src/utils/indexedDb.ts`
- Hasura commerce cart methods in `internship-frontend/src/features/products/hasuraCommerce.ts`:
  - `fetchCart()`
  - `syncCart()`

Hasura cart metadata:

- `internship-backend/hasura/metadata/databases/default/tables/public_cart_items.yaml`
  - row-level permissions scoped by `X-Hasura-User-Id`

## 5. Checkout Feature

Primary UI files:

- Checkout multi-step page: `internship-frontend/src/features/products/CheckoutPage.tsx`
- Stripe payment form: `internship-frontend/src/features/products/StripePaymentForm.tsx`
- Success page: `internship-frontend/src/features/products/OrderSuccessPage.tsx`

### 5.1 Checkout steps

`CheckoutPage.tsx` steps:

1. Address step (`address`)
2. Payment method step (`payment`)
3. Review step (`review`)
4. Stripe card step (`stripe`) for card payments

Additional behavior:

- Pincode auto-lookup via external API (`api.postalpincode.in`)
- Stable checkout attempt ID generation (`ORD-*`)
- Signature-based reuse of existing pending order attempt to avoid duplicate order creation

### 5.2 Place order action (all payment methods)

Frontend call path:

- `handlePlaceOrder()` in `CheckoutPage.tsx`
- calls `createOrderViaAction()` in `hasuraCommerce.ts`
- sends Hasura action mutation `createOrder`

Backend path:

- Express route: `/hasura/actions/create-order` (`internship-backend/src/routes/hasura.ts`)
- Controller: `internship-backend/src/controllers/hasura/createOrder.action.ts`
- Service: `internship-backend/src/services/hasura/order.service.ts`
- Model writes: `internship-backend/src/models/order.model.ts`

What `createOrderFromActionInput()` does:

- validates input
- validates products and stock availability
- computes subtotal from DB product prices
- enforces idempotency via `checkout_idempotency` record keyed by order attempt ID
- cancels previous pending orders for same user (and their pending payments/reservations)
- inserts order + order_items + shipping_addresses
- clears user cart_items

Related cleanup/cron:

- idempotency cleanup model: `internship-backend/src/models/checkoutIdempotency.model.ts`
- cleanup cron scheduler in `internship-backend/src/index.ts`

### 5.3 COD flow

1. Order is created via action.
2. Frontend clears cart and navigates to `/order-success`.
3. Temporal workflow later confirms order and payment status path (see section 6).

### 5.4 Card (Stripe) flow

Frontend:

1. After `createOrder`, call `createStripePaymentIntentViaAction()`.
2. Backend returns `clientSecret` and `paymentIntentId`.
3. `StripePaymentForm.tsx` confirms payment via Stripe Elements.
4. Form polls `fetchOrderConfirmationByExternalId()` until backend state is confirmed.
5. On success, navigates to `OrderSuccessPage` with merged order/payment data.

Backend:

- Action route: `/hasura/actions/create-stripe-payment-intent`
- Controller: `internship-backend/src/controllers/hasura/createStripePaymentIntent.action.ts`
- Service: `internship-backend/src/services/hasura/payment.service.ts`

`createStripeIntentForOrder()` behavior:

- validates order ownership and amount
- reuses active existing Stripe intent if available
- prevents duplicate if already succeeded
- creates Stripe PaymentIntent with idempotency key
- persists/updates payment row in `payments`

Payment status action used by frontend polling/history enrichment:

- Action route: `/hasura/actions/get-payment-status`
- Controller: `internship-backend/src/controllers/hasura/getPaymentStatus.action.ts`
- Service: `internship-backend/src/services/hasura/payment.service.ts` (`getPaymentStatusForOrder`)

## 6. Async Workflow and Event Flow (Hasura + Temporal + Stripe)

### 6.1 Hasura event trigger on order insert

Metadata:

- Orders table metadata: `internship-backend/hasura/metadata/databases/default/tables/public_orders.yaml`
- Event trigger name: `order_inserted_start_workflow`
- Webhook: env `HASURA_ORDER_EVENT_WEBHOOK_URL`
- Secret header: `x-hasura-event-secret`

Backend handler:

- Route: `/hasura/events/order-inserted`
- Controller: `internship-backend/src/controllers/hasura/orderInserted.event.ts`
- Service: `internship-backend/src/services/hasura/event.service.ts`

This starts Temporal workflow `orderPlacementWorkflow` with ID `order-{order_id}`.

### 6.2 Temporal order workflow

Files:

- Client helpers: `internship-backend/src/temporal/client.ts`
- Workflow: `internship-backend/src/temporal/workflows/orderPlacement.ts`
- Activities: `internship-backend/src/temporal/activities/order.activities.ts`
- Lambda activity: `internship-backend/src/temporal/activities/lambda.activities.ts`

Workflow responsibilities:

1. Validate inventory.
2. Reserve inventory (5-min reservation).
3. Start child workflow for reservation timeout release.
4. Ensure order/payment records exist.
5. Wait for payment signal for card (COD auto-passes).
6. Confirm inventory and order.
7. Mark COD payment succeeded.
8. Send confirmation email via Lambda.
9. On failure/timeout: release inventory, rollback order to cancelled, mark payment cancelled, send payment_failed email.

### 6.3 Stripe webhook processing

Backend webhook files:

- Signature middleware: `internship-backend/src/middleware/stripeWebhook.ts`
- Controller: `internship-backend/src/controllers/payment.controller.ts`
- Service: `internship-backend/src/services/payments/webhook.service.ts`

Endpoints in `index.ts`:

- `POST /payments/stripe/webhook`
- `POST /payments/stripe` (backward-compatible)

Webhook service behavior:

- `payment_intent.succeeded`:
  - update payment status
  - signal Temporal workflow `paymentCompleted`
- `payment_intent.payment_failed`:
  - mark payment failed
- `payment_intent.canceled`:
  - mark payment cancelled
  - cancel order
  - release pending inventory reservations

## 7. Order History and Order Detail (Realtime)

UI files:

- Order history page: `internship-frontend/src/features/products/OrderHistoryPage.tsx`
- Order detail page: `internship-frontend/src/features/products/OrderDetailPage.tsx`
- Generic subscription hook: `internship-frontend/src/hooks/useHasuraSubscription.ts`
- GraphQL subscription implementation: `internship-frontend/src/utils/hasuraClient.ts`
- Queries/subscriptions API: `internship-frontend/src/features/products/hasuraCommerce.ts`

Flow:

1. Pages subscribe via `subscribeOrderHistory()` / `subscribeOrderByExternalId()`.
2. `subscribeHasura()` opens GraphQL WS connection (`graphql-ws`).
3. Incoming order rows are enriched with payment status using `getPaymentStatus` action if needed.
4. UI shows live badge (`status === "live"`) and updates on changes.

Hasura permissions used:

- Orders: `public_orders.yaml`
- Order items: `public_order_items.yaml`
- Shipping addresses: `public_shipping_addresses.yaml`
- Payments: `public_payments.yaml`

All are scoped to current user via `X-Hasura-User-Id` relationship filters.

## 8. Email Notifications

Frontend trigger:

- Resend button in `OrderSuccessPage.tsx`
- Calls `invokeEmailLambdaViaAction()` in `hasuraCommerce.ts`

Hasura/backend path:

- Action: `invokeEmailLambda`
- Route: `/hasura/actions/invoke-email-lambda`
- Controller: `internship-backend/src/controllers/hasura/invokeEmailLambda.action.ts`
- Service: `internship-backend/src/services/hasura/lambda.service.ts`
- Activity: `internship-backend/src/temporal/activities/lambda.activities.ts`

Supports types:

- `confirmation`
- `payment_failed`
- `cancellation`

## 9. Hasura Metadata and Access Control Source of Truth

Main metadata export:

- `internship-backend/hasura-metadata.json`

Operational metadata files (modular YAML):

- `internship-backend/hasura/metadata/databases/default/tables/public_products.yaml`
- `internship-backend/hasura/metadata/databases/default/tables/public_cart_items.yaml`
- `internship-backend/hasura/metadata/databases/default/tables/public_orders.yaml`
- `internship-backend/hasura/metadata/databases/default/tables/public_order_items.yaml`
- `internship-backend/hasura/metadata/databases/default/tables/public_shipping_addresses.yaml`
- `internship-backend/hasura/metadata/databases/default/tables/public_payments.yaml`
- `internship-backend/hasura/metadata/databases/default/tables/public_inventory_reservations.yaml`
- `internship-backend/hasura/metadata/databases/default/tables/public_users.yaml`

## 10. File Responsibility Index (Feature-Oriented)

### Authentication

- Frontend UI: `internship-frontend/src/features/auth/Login.tsx`, `Signup.tsx`
- Frontend auth state: `authSlice.ts`, `authListener.ts`
- Firebase setup: `internship-frontend/src/firebase/config.ts`
- Backend auth exchange: `internship-backend/src/services/hasura/auth.service.ts`
- Hasura token claims: `internship-backend/src/shared/auth/hasuraToken.ts`

### Products

- Product listing/detail UI: `ProductsPage.tsx`, `ProductDetailPage.tsx`
- Product API wrapper: `productApi.ts`
- Hasura queries: `hasuraCommerce.ts`

### Cart

- State logic: `cartSlice.ts`, `cartSelectors.ts`
- UI: `CartPage.tsx`
- Sync middleware: `cartListener.ts`
- Offline fallback: `utils/indexedDb.ts`

### Checkout and Payment

- Checkout UI orchestration: `CheckoutPage.tsx`
- Card entry and confirm: `StripePaymentForm.tsx`
- Success view + email resend: `OrderSuccessPage.tsx`
- GraphQL action methods: `hasuraCommerce.ts`
- Backend order service: `services/hasura/order.service.ts`
- Backend payment service: `services/hasura/payment.service.ts`
- Stripe webhook: `controllers/payment.controller.ts`, `services/payments/webhook.service.ts`

### Orders Realtime

- Realtime hook: `hooks/useHasuraSubscription.ts`
- Order history/detail pages: `OrderHistoryPage.tsx`, `OrderDetailPage.tsx`
- Subscription transport: `utils/hasuraClient.ts`

### Workflow and Inventory

- Event trigger handling: `controllers/hasura/orderInserted.event.ts`, `services/hasura/event.service.ts`
- Temporal orchestration: `temporal/workflows/orderPlacement.ts`
- Inventory reservation/confirm/release: `models/inventory.model.ts`
- Order persistence: `models/order.model.ts`
- Payment persistence: `models/payment.model.ts`

## 11. Important Runtime Configuration (Where used)

Frontend env vars:

- `VITE_HASURA_URL` (GraphQL endpoint)
- `VITE_STRIPE_PUBLISHABLE_KEY` (Stripe Elements)
- Firebase vars (`VITE_FIREBASE_*`)
- `VITE_SENTRY_*` (optional monitoring)

Backend env vars:

- `JWT_SECRET`
- `HASURA_JWT_SECRET`
- `HASURA_ACTION_SECRET`
- `HASURA_EVENT_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `EMAIL_LAMBDA_FUNCTION_NAME`
- `TEMPORAL_ADDRESS`
- `FRONTEND_ORIGINS`

## 12. Sequence Summary (Login -> Purchase)

1. User authenticates with Firebase on frontend.
2. Frontend exchanges Firebase token with Hasura action `authLogin` to get backend + Hasura JWT.
3. Frontend uses Hasura JWT for all GraphQL table operations/actions.
4. User browses products (`products` query), adds cart (`cart_items` mutations).
5. Checkout creates order via `createOrder` action.
6. Hasura `orders` insert event triggers backend event endpoint.
7. Backend starts Temporal order workflow.
8. For card payment, frontend creates Stripe intent, confirms payment via Stripe.
9. Stripe webhook updates payment status and signals workflow.
10. Workflow confirms inventory/order and sends confirmation email.
11. Frontend order history/detail gets realtime updates via Hasura subscriptions.
