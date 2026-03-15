# Network / API Calls Documentation (End-to-End)

This document explains **every network path** used in this repo:
- How the **frontend** makes requests
- How **Hasura** routes table operations vs Actions vs Events
- How the **backend** is structured (routes → middleware → controller → service → model)
- What **requests/responses** look like
- Where **transactions** and **idempotency** are implemented (and why)

Repo structure:
- Frontend: `internship-frontend/`
- Backend: `internship-backend/`

---

## 1) The 4 Network Paths Used

### Path A — Frontend → Hasura “instant GraphQL” (tables)
Used for:
- Products list/detail
- Cart read/write
- Orders read/subscription (and order items + shipping address relationships)

Mechanism:
- Frontend sends GraphQL to Hasura `/v1/graphql`
- Hasura reads/writes Postgres directly (no Express controller involved)

Frontend wrapper:
- `internship-frontend/src/utils/hasuraClient.ts` (`hasuraRequest`)

### Path B — Frontend → Hasura Action (GraphQL) → Backend HTTP (Express)
Used for:
- `authLogin`
- `sendOtp`, `verifyOtp`
- `createOrder`
- `createStripePaymentIntent`
- `getPaymentStatus`
- `invokeEmailLambda`

Mechanism:
- Frontend sends GraphQL mutation (looks like normal GraphQL)
- Hasura Action forwards an HTTP POST to backend:
  - `/hasura/actions/*`
  - secured by `x-hasura-action-secret`

Backend wiring:
- Router: `internship-backend/src/routes/hasura.ts`
- Middleware: `internship-backend/src/middleware/hasura.ts`

### Path C — Postgres table event → Hasura Event Trigger → Backend HTTP → Temporal
Used for:
- “Order inserted” → start `orderPlacementWorkflow`

Mechanism:
- Insert into `orders`
- Hasura event trigger fires webhook:
  - `/hasura/events/order-inserted`
  - secured by `x-hasura-event-secret`
- Backend reads the order graph and starts a Temporal workflow idempotently

Metadata:
- `internship-backend/hasura/metadata/databases/default/tables/public_orders.yaml`

### Path D — Stripe → Backend webhook → Temporal signal
Used for:
- Payment success/failure updates
- Signaling the workflow (`paymentCompleted`)

Endpoints:
- `POST /payments/stripe/webhook`
- `POST /payments/stripe` (legacy compatible)

Backend wiring:
- Raw body + signature verification + idempotency gate

---

## 2) Frontend: How Requests Are Made

### 2.1 Hasura endpoint resolution
File: `internship-frontend/src/utils/hasuraUrl.ts`

- Uses `VITE_HASURA_URL` (or `VITE_API_URL` fallback).
- If the app runs on `https:` and Hasura is configured as `http://` (non-localhost), it upgrades to `https://` to avoid browser mixed-content blocks.

### 2.2 Queries and mutations (HTTP)
File: `internship-frontend/src/utils/hasuraClient.ts`

`hasuraRequest<T>(query, variables)` does:
- Reads Hasura JWT from `localStorage["jwt"]`
- Adds header: `Authorization: Bearer <jwt>`
- Uses Apollo Client under the hood:
  - `.query()` for `query`
  - `.mutate()` for `mutation`
- Uses `fetchPolicy: "no-cache"` for queries (always fresh server data)
- Retries once on transient network errors

### 2.3 Subscriptions (WebSocket)
File: `internship-frontend/src/utils/hasuraClient.ts`

`subscribeHasura<T>(query, variables, onData, onError)`:
- Opens a WebSocket to Hasura (ws/wss version of the same Hasura URL)
- Uses protocol `"graphql-ws"`
- Sends `connection_init` with Authorization header payload
- Streams `data` messages to `onData`
- Returns an `Unsubscribe` function that sends `stop` and closes the socket

React hook wrapper:
- `internship-frontend/src/hooks/useHasuraSubscription.ts`

### 2.4 Non-Hasura external API calls from frontend
- GitHub API (REST):
  - `internship-frontend/src/features/github/githubApi.ts`
- India Postal Pincode API (REST):
  - `internship-frontend/src/features/products/CheckoutPage.tsx`
- Stripe (client-side payment):
  - `internship-frontend/src/features/products/StripePaymentForm.tsx`

---

## 3) Backend: How Requests Are Handled (Routes → Middleware → Controller → Service → Model)

### 3.1 Express routes
File: `internship-backend/src/index.ts`

Registers:
- Hasura routes: `app.use("/hasura", hasuraRoutes)`
- Stripe webhooks: `POST /payments/stripe/webhook` and `POST /payments/stripe`

### 3.2 Hasura security middleware
Files:
- `internship-backend/src/middleware/hasura.ts`
- `internship-backend/src/controllers/hasura/helpers.ts`

What it enforces:
- `x-hasura-action-secret` must match `HASURA_ACTION_SECRET` (if configured)
- `x-hasura-event-secret` must match `HASURA_EVENT_SECRET` (if configured)
- `attachHasuraSessionUser` reads:
  - `req.body.session_variables["x-hasura-user-id"]`
  - `req.body.session_variables["x-hasura-firebase-uid"]`

### 3.3 Stripe webhook middleware (signature verification)
File: `internship-backend/src/middleware/stripeWebhook.ts`

What it enforces:
- Requires `stripe-signature` header
- Uses Stripe SDK to validate the signature and construct a verified Stripe Event object

### 3.4 Layering rule used in this backend

In general:
- **Routes**: URL mapping (`/hasura/actions/*`, `/payments/*`)
- **Middleware**: security checks + session extraction
- **Controllers**: parse inputs, call service, map errors to HTTP responses
- **Services**: business logic, transactions, integrations (Temporal, Stripe)
- **Models**: SQL/Knex operations, “data access layer” helpers

This separation is visible in the commerce flow:
- Controller: `internship-backend/src/controllers/hasura/createOrder.action.ts`
- Service: `internship-backend/src/services/hasura/order.service.ts`
- Models: `internship-backend/src/models/order.model.ts`, `internship-backend/src/models/inventory.model.ts`

---

## 4) End-to-End Call Flows (Request + Response + Backend Internals)

### 4.1 Auth: Firebase login → Hasura action `authLogin` → backend `authLogin`

Frontend trigger:
- `internship-frontend/src/features/auth/authListener.ts`

Frontend request (GraphQL to Hasura):
```graphql
mutation AuthLogin($firebaseIdToken: String!) {
  authLogin(firebaseIdToken: $firebaseIdToken) {
    token
    hasuraToken
    user { id uid email provider isGuest emailVerified }
  }
}
```

Frontend response usage:
- Persist `hasuraToken` in `localStorage["jwt"]`
- Redux auth state updated via `loginSuccess`

Hasura → backend:
- HTTP POST `POST /hasura/actions/auth-login`
- Includes Hasura action envelope + session variables (role can be anonymous here)

Backend internals:
- Route: `internship-backend/src/routes/hasura.ts`
- Controller: `internship-backend/src/controllers/hasura/authLogin.action.ts`
- Service: `internship-backend/src/services/hasura/auth.service.ts`

Business logic summary:
1. Verify Firebase ID token (or dev decode fallback).
2. Map provider (`google.com`, `github.com`, `anonymous`, `password`).
3. Upsert row in `users` (by firebase_uid, fallback by email).
4. Issue:
   - backend JWT (`token`) for compatibility
   - Hasura JWT (`hasuraToken`) with Hasura session claims

DB tables touched:
- `users`

---

### 4.2 OTP: Hasura action `sendOtp` / `verifyOtp` (email verification)

Frontend triggers:
- Signup: `internship-frontend/src/features/auth/Signup.tsx` calls `sendOtp`
- Verify page: `internship-frontend/src/features/auth/VerifyOtp.tsx` calls `sendOtp` (resend) + `verifyOtp`

Requests (GraphQL to Hasura):
```graphql
mutation SendOtp($email: String!, $purpose: String) {
  sendOtp(email: $email, purpose: $purpose) { success message expiresAt }
}
mutation VerifyOtp($email: String!, $otp: String!, $purpose: String) {
  verifyOtp(email: $email, otp: $otp, purpose: $purpose) { success message }
}
```

Backend internals:
- Routes:
  - `POST /hasura/actions/send-otp`
  - `POST /hasura/actions/verify-otp`
- Controllers:
  - `internship-backend/src/controllers/hasura/sendOtp.action.ts`
  - `internship-backend/src/controllers/hasura/verifyOtp.action.ts`
- Service:
  - `internship-backend/src/services/hasura/otp.service.ts`

Transaction + security summary (`otp.service.ts`):
- OTP is stored as:
  - `code_hash` (PBKDF2 hash) + `salt`
- Send OTP transaction:
  1. Mark previous unconsumed OTPs as consumed
  2. Insert new OTP row with TTL
- Verify OTP transaction (with `FOR UPDATE`):
  1. Lock the latest unconsumed OTP row
  2. Check expiry + attempt count
  3. Hash input and compare with timing-safe equality
  4. Mark OTP consumed

DB tables touched:
- `email_otps`
- `users` (on successful verify: sets `email_verified=true`)

---

### 4.3 Products: Query tables directly (no backend controller)

Frontend triggers:
- `internship-frontend/src/features/products/hasuraCommerce/products.ts`

Requests (GraphQL query to Hasura):
```graphql
query GetProducts { products(order_by: { id: asc }) { id title description price category thumbnail images rating stock } }
query GetProductById($id: Int!) { products_by_pk(id: $id) { ... } }
```

Backend internals:
- No Express action; Hasura executes SQL against Postgres.

DB tables touched:
- `products` (read)

---

### 4.4 Cart: Table mutations + listener-driven sync

Frontend triggers:
- `internship-frontend/src/features/products/cartListener.ts` observes Redux cart changes
- Uses: `internship-frontend/src/features/products/hasuraCommerce/cart.ts`

Hasura operations:
- Query:
```graphql
query GetCart { cart_items(order_by: { created_at: asc }) { id product_id title price thumbnail images quantity } }
```
- Mutations:
```graphql
mutation ClearCart { delete_cart_items(where: {}) { affected_rows } }
mutation InsertCart($objects: [cart_items_insert_input!]!) { insert_cart_items(objects: $objects) { affected_rows } }
```

Backend internals:
- No Express action; Hasura applies row-level permissions from metadata.

Resilience behavior:
- If Hasura sync fails, frontend writes fallback cart to IndexedDB:
  - `internship-frontend/src/utils/indexedDb.ts`

DB tables touched:
- `cart_items` (read/write)

---

### 4.5 Checkout: Hasura action `createOrder` (transaction + idempotency) + Hasura event trigger

Frontend trigger:
- `internship-frontend/src/features/products/CheckoutPage.tsx`
- GraphQL helper: `internship-frontend/src/features/products/hasuraCommerce/orders.ts`

Frontend request (GraphQL mutation to Hasura):
```graphql
mutation CreateOrder($items: [CreateOrderItemInput!]!, $address: CreateOrderAddressInput!, $paymentMethod: String!, $total: numeric!, $orderId: String, $orderDate: String) {
  createOrder(items: $items, address: $address, paymentMethod: $paymentMethod, total: $total, orderId: $orderId, orderDate: $orderDate) {
    orderId orderDate status orderStatus paymentStatus paymentMethod total
  }
}
```

Hasura → backend:
- `POST /hasura/actions/create-order`
- Middleware:
  - `ensureHasuraActionSecret`
  - `attachHasuraSessionUser` (requires `x-hasura-user-id` + `x-hasura-firebase-uid`)

Backend internals:
- Controller: `internship-backend/src/controllers/hasura/createOrder.action.ts`
- Service: `internship-backend/src/services/hasura/order.service.ts`
- Models:
  - `internship-backend/src/models/inventory.model.ts` (availability checks)
  - `internship-backend/src/models/order.model.ts` (order graph insert)

Business logic + transaction summary (`order.service.ts`):
1. Validate input (items, address, paymentMethod).
2. Fetch products from DB and compute authoritative subtotal (don’t trust frontend price).
3. Check stock availability (including pending reservations).
4. Build **request hash** (sha256 of user + payment method + items + address + total).
5. Use checkout idempotency key: `attempt:${orderId}`.
6. Open DB transaction:
   - If `checkout_idempotency` exists:
     - Lock the idempotency row with `FOR UPDATE`
     - If valid + same hash → return existing order (idempotent retry)
     - If same key + different hash → throw conflict (409)
   - Lock any other pending orders for user and cancel them (+ cancel their payments/reservations)
   - Insert order graph (orders + order_items + shipping_addresses)
   - Upsert `checkout_idempotency` record (unique constraint per user+key)
   - Clear cart rows (`cart_items`)
7. After commit: cancel superseded Temporal workflows (best-effort).

#### 4.5.1 createOrder transaction (step-by-step walkthrough)
Files:
- Service (transaction owner): `internship-backend/src/services/hasura/order.service.ts`
- Insert graph helper: `internship-backend/src/models/order.model.ts` (`createWithTrx`)

What the transaction guarantees:
- Either **all** order writes happen (order header + items + shipping address + idempotency row + cart clear),
  or **none** happen (rollback).

Key “correctness” details:
1. **Idempotency row lock**: if `checkout_idempotency` exists, the service does a `SELECT ... FOR UPDATE` so two retries cannot both create different orders for the same attempt key.
2. **Pending order lock/cancel**: it locks other `pending` orders for the same user with `FOR UPDATE` and cancels them inside the same transaction (including their `payments` and pending `inventory_reservations`).
3. **Upsert idempotency record**: inserts (or merges) the `checkout_idempotency` row so the next retry can return the same order.
4. **Cart clear is part of the same transaction**: ensures “order created” and “cart cleared” cannot diverge.
5. **Temporal cancellations happen after commit**: workflow cancellation is best-effort and should not cause DB rollback.

DB tables touched:
- `products` (read)
- `orders`, `order_items`, `shipping_addresses` (insert/update)
- `checkout_idempotency` (lock + upsert)
- `cart_items` (delete)
- `payments` and `inventory_reservations` (cancel stale pending)

Hasura Event Trigger (automatic after insert into `orders`):
- Trigger: `order_inserted_start_workflow`
- Webhook: `POST /hasura/events/order-inserted`
- Controller: `internship-backend/src/controllers/hasura/orderInserted.event.ts`
- Service: `internship-backend/src/services/hasura/event.service.ts`

Event service behavior:
1. Read “workflow payload” for this order (order header + items + address) using `OrderModel.getWorkflowDataByOrderId`.
2. Start workflow idempotently:
   - workflow type: `orderPlacementWorkflow`
   - workflow id: `order-${orderId}`
   - task queue: `ecommerce-orders` (configurable)

---

### 4.6 Payments (Card): `createStripePaymentIntent` → Stripe confirm → webhook → workflow signal

#### 4.6.1 Create (or reuse) Stripe PaymentIntent
Frontend trigger:
- `internship-frontend/src/features/products/CheckoutPage.tsx` / `orders.ts`

Frontend request:
```graphql
mutation CreateStripePaymentIntent($orderId: String!, $amount: numeric!, $currency: String) {
  createStripePaymentIntent(orderId: $orderId, amount: $amount, currency: $currency) {
    clientSecret paymentIntentId reused
  }
}
```

Backend internals:
- Controller: `internship-backend/src/controllers/hasura/createStripePaymentIntent.action.ts`
- Service: `internship-backend/src/services/hasura/payment.service.ts`
- Model: `internship-backend/src/models/payment.model.ts`

Business logic summary (`payment.service.ts`):
1. Validate `orderId`, amount.
2. Ensure order belongs to the session user.
3. Ensure amount matches the DB order total.
4. If an existing PaymentIntent exists and is reusable → return it.
5. Otherwise create a new PaymentIntent with Stripe **idempotencyKey** derived from order+amount+currency.
6. Insert/update `payments` row with `stripe_payment_intent_id`.

#### 4.6.2 Client confirmation (Stripe Elements)
Frontend trigger:
- `internship-frontend/src/features/products/StripePaymentForm.tsx`

Mechanism:
- `stripe.confirmPayment({ elements, redirect: "if_required", confirmParams: { payment_method_data: { billing_details }}})`

Then frontend waits for backend confirmation:
- Polls Hasura query `GetOrderConfirmation` (and uses `getPaymentStatus` action) for up to 60 seconds.

#### 4.6.3 Stripe webhook processing
Stripe triggers:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.canceled`

Backend endpoints:
- `POST /payments/stripe/webhook` (preferred)
- `POST /payments/stripe` (legacy)

Backend internals:
- Middleware: `internship-backend/src/middleware/stripeWebhook.ts` (signature verification)
- Controller: `internship-backend/src/controllers/payment.controller.ts`
- Service: `internship-backend/src/services/payments/webhook.service.ts`
- Idempotency model:
  - `internship-backend/src/models/stripeWebhookEvent.model.ts`

Idempotency gate:
- `beginWebhookEventProcessing(event.id, event.type)` ensures the same Stripe event is not processed twice.

Workflow signaling:
- On success: service updates `payments` and signals Temporal workflow:
  - workflow id: `order-${orderId}`
  - signal: `paymentCompleted(true)`

DB tables touched:
- `stripe_webhook_events` (idempotency gate)
- `payments` (status updates)
- `orders` + `inventory_reservations` (on cancellation path)

#### 4.6.4 Inventory reservation transactions (why they exist)
Files:
- `internship-backend/src/models/inventory.model.ts`

Two critical transactional operations:
1) `reserve(userId, items, orderExternalId)`:
- Starts a DB transaction
- Locks the relevant `products` rows with `FOR UPDATE` so stock checks are consistent
- Computes “reserved pending quantity” for each product
- Inserts `inventory_reservations` rows with a short expiry (5 minutes)

2) `confirm(reservationIds)`:
- Starts a DB transaction
- Locks reservations (`inventory_reservations ... FOR UPDATE`) to ensure they are still pending
- Locks `products` rows and decrements stock atomically
- Marks reservations `confirmed`

Why used:
- Prevents overselling under concurrency (multiple users checking out at the same time).

--- 

### 4.7 Payment Status: Hasura action `getPaymentStatus` (with Temporal reconciliation)

Frontend trigger:
- `internship-frontend/src/features/products/hasuraCommerce/payments.ts` (called when order implies “pending” and is card)

Request:
```graphql
mutation GetPaymentStatus($orderId: String!) {
  getPaymentStatus(orderId: $orderId) { status amount currency provider }
}
```

Backend internals:
- Controller: `internship-backend/src/controllers/hasura/getPaymentStatus.action.ts`
- Service: `internship-backend/src/services/hasura/payment.service.ts`

Reconciliation behavior (why it exists):
- If the DB order is still `pending` but the Temporal workflow is terminal (failed/cancelled/timed out),
  the backend updates DB to reflect cancellation and releases pending reservations.

DB tables touched:
- `orders`, `payments`, `inventory_reservations`

---

### 4.8 Orders: Hasura subscriptions (real-time)

Frontend triggers:
- History page: `internship-frontend/src/features/products/OrderHistoryPage.tsx`
- Detail page: `internship-frontend/src/features/products/OrderDetailPage.tsx`

Subscriptions:
- Order history:
```graphql
subscription OrderHistoryRealtime {
  orders(order_by: { created_at: desc }) { id order_id status payment_method total created_at }
}
```
- Order detail:
```graphql
subscription OrderDetailRealtime($orderId: String!) {
  orders(where: { order_id: { _eq: $orderId } }, limit: 1) {
    id order_id status payment_method total created_at
    order_items { id product_id title price thumbnail quantity }
    shipping_address: shipping_addresses(limit: 1) { full_name phone email address_line1 address_line2 city state pincode }
  }
}
```

Backend internals:
- No Express action; Hasura pushes row updates from Postgres over WS.

DB tables touched:
- `orders`, `order_items`, `shipping_addresses` (read)

---

### 4.9 Email: Hasura action `invokeEmailLambda` (manual resend)

Frontend trigger:
- `internship-frontend/src/features/products/OrderSuccessPage.tsx`

Request:
```graphql
mutation InvokeEmailLambda($type: String!, $orderId: String!, $email: String!, $payload: jsonb!) {
  invokeEmailLambda(type: $type, orderId: $orderId, email: $email, payload: $payload) { success message }
}
```

Backend internals:
- Controller: `internship-backend/src/controllers/hasura/invokeEmailLambda.action.ts`
- Service: `internship-backend/src/services/hasura/lambda.service.ts`

Temporal note:
- The workflow also attempts email sending through Temporal Lambda activity:
  - `internship-backend/src/temporal/activities/lambda.activities.ts`
  - but this action provides a “resend” from UI.

---

## 5) Temporal: Business Process Orchestration (How it connects to network)

Workflow start:
- Triggered by Hasura event on `orders` insert
- Started via backend `startWorkflowIdempotent(...)`:
  - `internship-backend/src/temporal/client.ts`

Main workflow:
- `internship-backend/src/temporal/workflows/orderPlacement.ts`

Key workflow phases (high level):
1. Validate inventory (activity)
2. Reserve inventory (activity)
3. Start child `inventoryReleaseWorkflow` as a timeout safety net (5 minutes)
4. Ensure order exists (activity)
5. Initiate payment record (activity)
6. Wait for payment signal if card; auto-pass for COD
7. Confirm inventory and confirm order (activities)
8. Send email via Lambda activity (best-effort)
9. Cancel the timeout child workflow after success

Network linkage:
- Stripe webhook signals the workflow `paymentCompleted(true)` so the workflow can continue.

---

## 6) Quick Reference: “Where is what?”

Frontend network entry points:
- Hasura HTTP: `internship-frontend/src/utils/hasuraClient.ts`
- Hasura WS: `internship-frontend/src/utils/hasuraClient.ts`
- Auth exchange: `internship-frontend/src/features/auth/authListener.ts`
- Commerce GraphQL: `internship-frontend/src/features/products/hasuraCommerce/*`

Backend action/event routing:
- Hasura routes: `internship-backend/src/routes/hasura.ts`
- Hasura middleware: `internship-backend/src/middleware/hasura.ts`
- Stripe webhook: `internship-backend/src/controllers/payment.controller.ts`

Core business services:
- Auth: `internship-backend/src/services/hasura/auth.service.ts`
- OTP: `internship-backend/src/services/hasura/otp.service.ts`
- Order creation: `internship-backend/src/services/hasura/order.service.ts`
- Payment: `internship-backend/src/services/hasura/payment.service.ts`
- Stripe webhook processing: `internship-backend/src/services/payments/webhook.service.ts`
- Hasura event → workflow: `internship-backend/src/services/hasura/event.service.ts`

Core idempotency implementations:
- Checkout: `checkout_idempotency` in `internship-backend/src/services/hasura/order.service.ts`
- Stripe webhook: `internship-backend/src/models/stripeWebhookEvent.model.ts`
- Stripe PaymentIntent: idempotencyKey in `internship-backend/src/services/hasura/payment.service.ts`
- Workflow start: `startWorkflowIdempotent` in `internship-backend/src/temporal/client.ts`
