# Backend Documentation (Page-wise) — Hasura + Temporal + PostgreSQL Concepts Used

Monorepo folder: `internship-backend/`

This document is written **page-wise (route-wise)**, but from the backend perspective:
- Which **Hasura** concepts are used (instant GraphQL API, tables, permissions, actions, events, subscriptions)
- Which **Temporal** concepts are used (worker, workflows, activities, signals, cron, retries)
- Which **PostgreSQL/transaction/idempotency** concepts are used
- Where they exist in the codebase (main files)

---

## Backend Tech Stack

- Runtime: **Node.js + TypeScript**
- HTTP server: **Express**
- DB: **PostgreSQL**
- DB access: **Knex**
- GraphQL layer: **Hasura**
  - Auto-generated (instant) GraphQL for tables (query/mutation/subscription)
  - Custom GraphQL **Actions** for business logic (Express handlers)
  - Event triggers for DB → webhook → backend
- Payments: **Stripe**
  - PaymentIntent create (idempotent)
  - Webhook handling (idempotent)
- Orchestration: **Temporal**
  - Workflows for order placement + inventory release + payment retry + cleanup cron

---

## Hasura: “Instant GraphQL API” in this project

Hasura auto-generates GraphQL operations for Postgres tables:
- **Queries** (read): `products`, `orders`, `cart_items`, etc.
- **Mutations** (write): `insert_cart_items`, `delete_cart_items`, etc.
- **Subscriptions** (real-time): `subscription { orders(...) { ... } }`

Metadata (tables + permissions + triggers):
- `internship-backend/hasura/metadata/databases/default/tables/*.yaml`

Metadata snapshot (includes Actions definitions):
- `internship-backend/hasura-metadata.json`

---

## Database Tables Used (what & why)

### Tables exposed through Hasura (instant GraphQL)
- `users`: authenticated users (Firebase identity mapped to internal user ID)
- `products`: product catalog (list + detail)
- `cart_items`: server-side cart per user
- `orders`: order headers + status lifecycle
- `order_items`: order line items
- `shipping_addresses`: address captured at checkout
- `payments`: payment state for each order
- `inventory_reservations`: inventory hold/reserve/confirm/release lifecycle

### Tables primarily for backend correctness (not required for frontend GraphQL)
- `checkout_idempotency`: prevents duplicate order creation for the same checkout attempt
- `stripe_webhook_events`: prevents double-processing of the same Stripe webhook event
- `email_otps`: stores OTP hashes for email verification (short TTL, limited attempts)

Where they are created/updated:
- Migrations:
  - `internship-backend/hasura/migrations/202603050001_baseline_schema.js`
  - `internship-backend/hasura/migrations/202603130001_stripe_webhook_events.js`
  - `internship-backend/hasura/migrations/202603140001_email_otp_verification.js`

---

## Hasura Actions (custom GraphQL mutations → Express → DB/Stripe/Temporal)

Hasura Actions are defined in `internship-backend/hasura-metadata.json` and mapped to Express routes in:
- `internship-backend/src/routes/hasura.ts`

### Action list (and what they do)
- `authLogin`: verify Firebase token, upsert user, return Hasura JWT
- `issueHasuraToken`: compatibility action (issue Hasura JWT from backend JWT)
- `sendOtp`: email OTP (writes `email_otps`)
- `verifyOtp`: verify OTP + mark `users.email_verified=true`
- `createOrder`: transactional order creation + idempotency + cart clear
- `createStripePaymentIntent`: create/reuse PaymentIntent using Stripe idempotency keys
- `getPaymentStatus`: returns payment state (with Temporal reconciliation)
- `invokeEmailLambda`: triggers AWS Lambda email sender

---

## Hasura Event Trigger (DB event → backend webhook → Temporal)

Event trigger:
- Table: `orders`
- Trigger name: `order_inserted_start_workflow`
- Config: `internship-backend/hasura/metadata/databases/default/tables/public_orders.yaml`
- Webhook handler: `POST /hasura/events/order-inserted`
  - Route: `internship-backend/src/routes/hasura.ts`
  - Controller: `internship-backend/src/controllers/hasura/orderInserted.event.ts`
  - Service: `internship-backend/src/services/hasura/event.service.ts`

Why used
- Keeps the frontend simple: frontend creates order (action), and the backend automatically starts the long-running orchestration when the row exists.

---

## Temporal (Workflows, Activities, Worker)

### Worker
File: `internship-backend/src/temporal/worker.ts`

Concepts used
- One worker process loads:
  - workflow bundle (`workflowsPath`)
  - activities modules
- Configured by environment:
  - namespace: `TEMPORAL_NAMESPACE`
  - task queue: `TEMPORAL_TASK_QUEUE`

### Workflows
Export index: `internship-backend/src/temporal/workflows/index.ts`

1) `orderPlacementWorkflow` — main orchestration
- File: `internship-backend/src/temporal/workflows/orderPlacement.ts`
- Uses:
  - **Activities** (inventory/order/payment steps)
  - **Signals**: `paymentCompleted` (from Stripe webhook)
  - **Child workflow**: `inventoryReleaseWorkflow` as a timeout safety net
  - Retries with backoff for transient failures

2) `inventoryReleaseWorkflow` — timeout-based inventory release
- File: `internship-backend/src/temporal/workflows/inventoryRelease.ts`
- Uses:
  - `sleep()` for “wait N minutes”
  - checks reservation statuses and releases if still pending

3) `paymentRetryWorkflow` — retry loop and eventual cancel
- File: `internship-backend/src/temporal/workflows/paymentRetry.ts`
- Uses:
  - **Signal**: `paymentReceived`
  - `condition()` with timeout for “wait for payment”
  - retries + notification activities + final cancel

4) `inventoryCleanupSweepWorkflow` — cron safety net
- File: `internship-backend/src/temporal/workflows/inventoryCleanupSweep.ts`
- Started as a cron workflow from backend startup:
  - `internship-backend/src/temporal/client.ts`
  - called in `internship-backend/src/index.ts`

### Activities (side effects)
- `internship-backend/src/temporal/activities/order.activities.ts`
- `internship-backend/src/temporal/activities/inventory.activities.ts`
- `internship-backend/src/temporal/activities/lambda.activities.ts`

Why used
- Temporal workflows must be deterministic; all DB writes, Stripe/Lambda calls, etc. are done as activities.

---

## PostgreSQL Transactions, Locking, and Idempotency (core correctness topics)

### 1) Transactional order creation (atomic writes)
Main service: `internship-backend/src/services/hasura/order.service.ts`

Concepts used
- `db.transaction(async (trx) => { ... })`
- `SELECT ... FOR UPDATE` to safely read/update idempotency records and pending orders

Why used
- Ensures “create order + items + shipping address + idempotency record + clear cart” behaves atomically.
- Prevents race conditions when the user clicks “Place order” multiple times or retries on bad networks.

### 2) Checkout idempotency (dedupe by attempt id)
Table: `checkout_idempotency` (migration: `202603050001_baseline_schema.js`)

Concepts used
- Idempotency key format: `attempt:${orderId}`
- `request_hash` (sha256) to detect “same orderId but different cart/address/payment data”

Why used
- Returns the existing non-cancelled order when the same attempt is retried.
- Returns conflict (`409`) when same `orderId` is reused with changed payload.

### 3) Stripe PaymentIntent idempotency + reuse
Service: `internship-backend/src/services/hasura/payment.service.ts`

Concepts used
- Reuse existing intent if still valid (retrieve intent by ID)
- Create new intent with a Stripe `idempotencyKey` based on order + amount + currency

Why used
- Prevents duplicate charges during retries/timeouts.

### 4) Stripe webhook idempotency
Table: `stripe_webhook_events` (migration: `202603130001_stripe_webhook_events.js`)
Service: `internship-backend/src/services/payments/webhook.service.ts`

Concepts used
- “Gate” record per Stripe event id:
  - first time → process
  - duplicates → ignore

Why used
- Stripe may deliver the same event more than once; webhook handling must be safe.

### 5) OTP verification (secure storage + transaction)
Service: `internship-backend/src/services/hasura/otp.service.ts`

Concepts used
- Store **hashed OTP** (PBKDF2) + random salt (no plaintext OTP in DB)
- Transaction + `FOR UPDATE` when verifying to prevent double-consumption / race conditions
- Attempt limit (`MAX_ATTEMPTS`) + TTL (`expires_at`)

Why used
- Prevents OTP brute-force and ensures consistent verification semantics.

---

## Page-wise Backend Mapping (Frontend route → Hasura/Backend/Temporal/DB)

### Page: `/login`
Frontend triggers
- Firebase login (client-side)
- Hasura Action: `authLogin(firebaseIdToken)`

Backend pieces
- Route: `POST /hasura/actions/auth-login` (`internship-backend/src/routes/hasura.ts`)
- Controller: `internship-backend/src/controllers/hasura/authLogin.action.ts`
- Service: `internship-backend/src/services/hasura/auth.service.ts`
- DB table touched: `users` (upsert)

Hasura concept
- Action is a **GraphQL mutation** but the logic runs in Express.

### Page: `/signup`
Frontend triggers
- Firebase `createUserWithEmailAndPassword`
- Hasura Action: `sendOtp(email, purpose)`

Backend pieces
- Route: `POST /hasura/actions/send-otp`
- Controller: `internship-backend/src/controllers/hasura/sendOtp.action.ts`
- Service: `internship-backend/src/services/hasura/otp.service.ts`
- DB table touched: `email_otps`

### Page: `/verify-otp`
Frontend triggers
- Hasura Action: `verifyOtp(email, otp, purpose)`
- Optional: `sendOtp` for resend

Backend pieces
- Route: `POST /hasura/actions/verify-otp`
- Controller: `internship-backend/src/controllers/hasura/verifyOtp.action.ts`
- Service: `internship-backend/src/services/hasura/otp.service.ts`
- DB tables touched:
  - `email_otps` (consume)
  - `users` (set `email_verified=true` for verification purposes)

### Page: `/products`
Frontend triggers
- Hasura **query**: `products(...)`

Backend pieces
- No Express endpoint required (Hasura reads Postgres directly)
- DB table: `products` (read)

### Page: `/product/:id`
Frontend triggers
- Hasura **query**: `products_by_pk(id: ...)`

Backend pieces
- No Express endpoint required
- DB table: `products` (read)

### Page: `/cart`
Frontend triggers
- Hasura **query**: `cart_items(...)`
- Hasura **mutations**:
  - `delete_cart_items(where: {})`
  - `insert_cart_items(objects: ...)`

Backend pieces
- No Express endpoint required (Hasura handles insert/delete)
- DB table: `cart_items` (read/write)

Hasura concept
- Row-level permissions in metadata restrict cart reads/writes to the session user.

### Page: `/checkout`
Frontend triggers
- Hasura Action: `createOrder(...)`
- If card payment:
  - Hasura Action: `createStripePaymentIntent(orderId, amount, currency)`

Backend pieces (create order)
- Action route: `POST /hasura/actions/create-order`
- Controller: `internship-backend/src/controllers/hasura/createOrder.action.ts`
- Service: `internship-backend/src/services/hasura/order.service.ts`
- DB tables touched (transactional):
  - `orders`, `order_items`, `shipping_addresses`
  - `checkout_idempotency`
  - `cart_items` (cleared)
  - `inventory_reservations` (stale cancellations/releases when needed)
  - `payments` (stale cancellations when needed)

Backend pieces (stripe intent)
- Action route: `POST /hasura/actions/create-stripe-payment-intent`
- Controller: `internship-backend/src/controllers/hasura/createStripePaymentIntent.action.ts`
- Service: `internship-backend/src/services/hasura/payment.service.ts`
- Stripe concept: PaymentIntent create with idempotency key

Temporal trigger (after order row exists)
- Hasura Event trigger on `orders` insert:
  - calls `POST /hasura/events/order-inserted`
  - backend starts `orderPlacementWorkflow` idempotently (`workflowId = order-${orderId}`)

### Page: `/order-success`
Frontend triggers
- Hasura Action: `invokeEmailLambda(type, orderId, email, payload)`

Backend pieces
- Action route: `POST /hasura/actions/invoke-email-lambda`
- Controller: `internship-backend/src/controllers/hasura/invokeEmailLambda.action.ts`
- Service: `internship-backend/src/services/hasura/lambda.service.ts`
- Temporal note: The workflow also tries to send confirmation email via activity; this page provides an explicit “resend” mechanism.

### Page: `/orders` (Order history)
Frontend triggers
- Hasura **subscription**: `orders(order_by: { created_at: desc })`
- When payment is pending and method is not COD:
  - Hasura Action: `getPaymentStatus(orderId)`

Backend pieces
- Hasura subscription reads Postgres:
  - DB table: `orders` (read)
- Payment status action:
  - Route: `POST /hasura/actions/get-payment-status`
  - Controller: `internship-backend/src/controllers/hasura/getPaymentStatus.action.ts`
  - Service: `internship-backend/src/services/hasura/payment.service.ts`
  - DB tables: `orders`, `payments`, `inventory_reservations` (reconciliation on terminal workflow)

### Page: `/orders/:orderId` (Order detail)
Frontend triggers
- Hasura **subscription** for one order + relationships:
  - order header
  - `order_items`
  - `shipping_addresses(limit: 1)`

Backend pieces
- Reads Postgres via Hasura:
  - `orders`, `order_items`, `shipping_addresses`
- Optional payment enrichment via `getPaymentStatus` action (same as history)

---

## Stripe Webhook (not a UI page, but critical to the workflow)

Endpoint
- `POST /payments/stripe/webhook`
- `POST /payments/stripe` (legacy compatible path)

Files
- `internship-backend/src/index.ts` (route registration + raw body)
- `internship-backend/src/middleware/stripeWebhook.ts` (signature verification)
- `internship-backend/src/controllers/payment.controller.ts`
- `internship-backend/src/services/payments/webhook.service.ts`

What happens
- On `payment_intent.succeeded`, backend updates `payments` and signals Temporal:
  - workflow id: `order-${orderId}`
  - signal: `paymentCompleted(true)`

