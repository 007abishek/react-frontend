# Project Feature Data Contracts

This document describes what the frontend sends, how data is validated, request/response contracts, params, and business logic for each feature in this repo.

## 1) High-Level Architecture

- Frontend app: `internship-frontend`
- Backend app: `internship-backend`
- Main runtime pattern for commerce data:
  - Frontend calls Hasura GraphQL (`hasuraRequest` / `subscribeHasura`)
  - Hasura actions forward to backend Express handlers (`/hasura/actions/*`)
  - Backend validates/normalizes and writes DB, payment, inventory, workflow state
- Additional external APIs:
  - Firebase Auth (signup/login/social/guest)
  - GitHub REST API (search users/repos)
  - Stripe (client payment + webhook)
  - India Postal Pincode API (address autofill helper)

## 2) Global Request Envelopes

### 2.1 Hasura GraphQL requests from frontend

All frontend GraphQL queries/mutations are sent through `hasuraRequest(query, variables)` with:

- Header: `Authorization: Bearer <jwt>`
- Operation types supported: `query`, `mutation`
- `subscription` handled separately via `subscribeHasura`

Typical shape:

```json
{
  "query": "mutation ...",
  "variables": {
    "...": "..."
  }
}
```

### 2.2 Hasura Action HTTP payload to backend

Hasura posts to backend action handlers with this pattern:

```json
{
  "action": { "name": "createOrder" },
  "input": { "...actionArgs" },
  "session_variables": {
    "x-hasura-user-id": "<db user id>",
    "x-hasura-firebase-uid": "<firebase uid>",
    "x-hasura-role": "user"
  }
}
```

Backend action handlers read:

- `req.body.input.*` for arguments
- `req.body.session_variables.*` for authenticated user context

### 2.3 Standard backend error style

Most handlers return:

```json
{ "message": "..." }
```

with status codes like `400`, `401`, `404`, `409`, `500`.

## 3) Feature: Auth

## Frontend routes

- `/login`
- `/signup`

## Frontend payloads and validation

### Signup form (`Signup.tsx`)

Payload:

```json
{
  "email": "string",
  "password": "string"
}
```

Validation (`signupFormSchema`):

- `email`: required, trimmed, valid email format
- `password`: required, min length 6

Action:

- `createUserWithEmailAndPassword(auth, email, password)`
- `sendEmailVerification(user)`
- `signOut(auth)` (forces email verification before login)

### Login form (`Login.tsx`)

Payload:

```json
{
  "email": "string",
  "password": "string"
}
```

Validation (`loginFormSchema`): same as signup.

Email/password flow:

- Firebase `signInWithEmailAndPassword`
- Reload user and enforce `emailVerified === true` for non-OAuth users

OAuth/Guest flows:

- Google: popup on desktop, redirect on mobile
- GitHub: popup
- Guest: `signInAnonymously`
- OAuth linking: if Firebase throws `auth/account-exists-with-different-credential`, frontend uses `fetchSignInMethodsForEmail` and links accounts after signing in with the existing method (`linkWithCredential`).

## Auth exchange to backend (from `authListener.ts`)

Hasura endpoint resolution:

- Frontend uses `resolveHasuraUrl()` (from `VITE_HASURA_URL` or `VITE_API_URL`).
- When the app is served over `https`, it upgrades a non-local `http://` Hasura URL to `https://` to avoid mixed-content blocks.

GraphQL mutation sent by frontend:

```graphql
mutation AuthLogin($firebaseIdToken: String!) {
  authLogin(firebaseIdToken: $firebaseIdToken) {
    token
    hasuraToken
    user {
      id
      uid
      email
      provider
      isGuest
      emailVerified
    }
  }
}
```

Variables:

```json
{ "firebaseIdToken": "<firebase id token>" }
```

Response used:

```json
{
  "data": {
    "authLogin": {
      "token": "<backend_jwt>",
      "hasuraToken": "<hasura_jwt>",
      "user": {
        "id": 1,
        "uid": "...",
        "email": "user@example.com",
        "provider": "password|google|github|guest",
        "isGuest": false,
        "emailVerified": true
      }
    }
  }
}
```

Post-response logic:

- Save `hasuraToken` in `localStorage["jwt"]` (single persisted token used by frontend for Hasura auth)
- Apollo sends `Authorization: Bearer <jwt>`
- Clear cart/payment caches on logout or auth failures
- If `emailVerified` is false for password accounts, frontend forces sign-out and shows OTP verification message before allowing login.

## Backend action: `/hasura/actions/auth-login`

Input required:

- `input.firebaseIdToken` (string, required)

Validation/logic:

- Verifies token with Firebase Admin
- Maps provider:
  - `google.com -> google`
  - `github.com -> github`
  - `anonymous -> guest`
  - else `password`
- Upserts user in DB by firebase UID, or by email fallback
- Issues two tokens:
  - `hasuraToken`: JWT containing Hasura session claims
  - `token`: backend app JWT (returned but not used by frontend)

Response:

```json
{
  "token": "<backend_jwt>",
  "hasuraToken": "<hasura_jwt>",
  "user": {
    "id": 1,
    "uid": "firebase_uid",
    "email": "user@example.com",
    "provider": "password",
    "isGuest": false,
    "emailVerified": true
  }
}
```

Errors:

- `400` if missing token
- `401` authentication failed

## 4) Feature: Todos

## Frontend route

- `/todos`

## Data model

```ts
Todo {
  id: string;
  text: string;
  completed: boolean;
}
```

## Frontend payloads and validation

### Add todo

Payload to Redux action `addTodo`:

```json
"todo text"
```

Validation (`todoTextSchema`):

- string
- trim
- min 1 char
- max 100 chars

Validation happens in two places:

1. Page handler before dispatch
2. Slice reducer as final safety net

## Persistence (no backend HTTP)

Todos are saved in IndexedDB object store `todos-by-user` keyed by `user.uid`.

Read/write contracts:

- `loadTodosForUser(userId) -> Promise<Todo[]>`
- `saveTodosForUser(userId, todos) -> Promise<void>`

## Core logic

- On auth resolve + user present: load todos from IndexedDB, dispatch `setTodos`
- After hydration: save every todos change back to IndexedDB
- Guest logic: max 3 todos; further adds show signup prompt
- UI pagination only (`PAGE_SIZE = 8`), no API params

## 5) Feature: GitHub Search

## Frontend route

- `/github`

## User inputs and validation

### Query validation (`githubSearchQuerySchema`)

- required non-empty after trim
- max 100 chars
- regex: `^[\w\s\-./]+$`

### Page validation (`githubPageSchema`)

- integer
- min 1

## Outbound requests (direct to GitHub REST)

Base URL: `https://api.github.com`

### Search users

`GET /search/users`

Params:

- `q`: query string
- `page`: page number
- `per_page=10`

### Search repositories

`GET /search/repositories`

Params:

- `q`
- `page`
- `per_page=10`

### Get single user

`GET /users/{username}`

Path param:

- `username` URL-encoded

### Get user repos

`GET /users/{username}/repos?sort=updated&per_page=10`

## Response shapes used

Users search:

```json
{ "items": [{ "login": "...", "avatar_url": "...", "html_url": "..." }] }
```

Repos search:

```json
{ "items": [{ "id": 1, "name": "...", "html_url": "...", "stargazers_count": 10, "forks_count": 2, "owner": { "login": "..." } }] }
```

## Error handling logic

- Any non-2xx -> error with `status`
- `403` treated as likely rate-limit in UI
- Debounce: 500ms before firing search

## 6) Feature: Products + Cart

## Frontend routes

- `/products`
- `/product/:id`
- `/cart`

## Route param validation

`productIdParamSchema`:

- coerced number
- integer
- positive

Invalid `:id` skips data query and shows invalid product id UI.

## Product query contracts

### Fetch all products (`fetchProducts`)

GraphQL query:

```graphql
query GetProducts {
  products(order_by: { id: asc }) {
    id title description price category thumbnail images rating stock
  }
}
```

Response consumed:

```json
{ "products": [ { "id": 1, "title": "...", "price": 100 } ] }
```

Post-processing:

- Normalize `price`, `rating`, `stock` to numbers.

### Fetch one product by id (`fetchProductById`)

GraphQL query with variable:

```graphql
query GetProductById($id: Int!) {
  products_by_pk(id: $id) {
    id title description price category thumbnail images rating stock
  }
}
```

Variables:

```json
{ "id": 1 }
```

Response:

```json
{ "products_by_pk": { "id": 1, "title": "..." } }
```

or `null` when missing.

## Search validation in product list

`productSearchQuerySchema`:

- string
- trim
- max 120 chars

Filtering is local in frontend on title/description/category.

## Cart payloads (Redux)

Cart item shape:

```json
{
  "id": 1,
  "title": "Product",
  "price": 999,
  "thumbnail": "url",
  "images": ["url"],
  "quantity": 1
}
```

Actions and params:

- `addToCart(cartItem)`
- `increaseQty(productId: number)`
- `decreaseQty(productId: number)`
- `removeFromCart(productId: number)`
- `setCart(items: CartItem[])`

Validation/normalization logic:

- `safeNumber` normalizes `price` and `quantity`
- Existing cart item merge behavior increments quantity
- Quantity floor maintained (`> 0` and not reduced below 1 in UI flow)

## Cart backend sync contracts

### Fetch cart

```graphql
query GetCart {
  cart_items(order_by: { created_at: asc }) {
    id product_id title price thumbnail images quantity
  }
}
```

Mapped to frontend `CartItem` using `product_id -> id`.

### Sync cart (replace behavior)

1. Mutation clear all:

```graphql
mutation ClearCart {
  delete_cart_items(where: {}) { affected_rows }
}
```

2. If items exist, bulk insert:

```graphql
mutation InsertCart($objects: [cart_items_insert_input!]!) {
  insert_cart_items(objects: $objects) { affected_rows }
}
```

Variables:

```json
{
  "objects": [
    {
      "product_id": 1,
      "title": "...",
      "price": 999,
      "thumbnail": "...",
      "images": ["..."],
      "quantity": 2
    }
  ]
}
```

Sync trigger logic (`cartListener`):

- Debounced ~500ms after cart state change
- For authenticated non-guest users:
  - try Hasura sync first
  - fallback to IndexedDB `cart-by-user`

## 7) Feature: Checkout + Orders + Payments

## Frontend routes

- `/checkout`
- `/order-success`
- `/orders`
- `/orders/:orderId`

## Route param validation

`orderIdParamSchema`:

- string
- trim
- min 1
- max 120

## Checkout input validation

### Address (`checkoutAddressSchema`)

- `fullName`: trim, 2-80
- `phone`: exactly 10 digits (`^\d{10}$`)
- `email`: valid email
- `addressLine1`: 5-160
- `addressLine2`: 2-160 (required in current schema)
- `city`: 2-80
- `state`: 2-80
- `pincode`: exactly 6 digits (`^\d{6}$`)

### Payment method

- enum: `cod | card`

### Items

Each item:

- `id`: positive int
- `quantity`: positive int
- `price`: non-negative number

Array must contain at least 1 item.

### Total

- positive
- finite number

## External helper API in checkout

Pincode auto-fill request:

- `GET https://api.postalpincode.in/pincode/{pincode}`
- Used only for city/state suggestions and autofill
- Not part of order placement contract

## Order creation contract (frontend -> Hasura action)

Mutation:

```graphql
mutation CreateOrder(
  $items: [CreateOrderItemInput!]!
  $address: CreateOrderAddressInput!
  $paymentMethod: String!
  $total: numeric!
  $orderId: String
  $orderDate: String
) {
  createOrder(
    items: $items
    address: $address
    paymentMethod: $paymentMethod
    total: $total
    orderId: $orderId
    orderDate: $orderDate
  ) {
    orderId orderDate status orderStatus paymentStatus paymentMethod total
  }
}
```

Variables sent:

```json
{
  "items": [{ "productId": 1, "title": "Product", "price": 999, "quantity": 1 }],
  "address": {
    "fullName": "John Doe",
    "phone": "9999999999",
    "email": "john@example.com",
    "addressLine1": "Street 1",
    "addressLine2": "Area",
    "city": "Pune",
    "state": "Maharashtra",
    "pincode": "411001"
  },
  "paymentMethod": "cod",
  "total": 999,
  "orderId": "ORD-...",
  "orderDate": "2026-03-10T...Z"
}
```

Response consumed:

```json
{
  "orderId": "ORD-...",
  "orderDate": "2026-03-10T...Z",
  "status": "pending",
  "orderStatus": "pending",
  "paymentStatus": "pending|not_required|...",
  "paymentMethod": "cod|card",
  "total": 999
}
```

## Backend validation/logic for create order

`createOrder` backend rules:

- requires non-empty items array
- requires `address.fullName`, `address.phone`, `address.addressLine1`
- requires `paymentMethod`
- every `productId` must be positive integer
- every `quantity` must be positive integer
- all product IDs must exist in DB
- checks inventory availability per product
- computes subtotal from DB prices (not trusting frontend price/total)
- idempotency by key: `attempt:<orderId>`
  - same `orderId` + different request hash -> `409`
  - same request -> returns existing order
- cancels previous pending orders for same user before creating new pending order
- clears user cart after order create
- may cancel superseded Temporal workflows

## Stripe payment intent contract

Frontend mutation:

```graphql
mutation CreateStripePaymentIntent($orderId: String!, $amount: numeric!, $currency: String) {
  createStripePaymentIntent(orderId: $orderId, amount: $amount, currency: $currency) {
    clientSecret paymentIntentId reused
  }
}
```

Variables:

```json
{ "orderId": "ORD-...", "amount": 999, "currency": "inr" }
```

Response:

```json
{ "clientSecret": "...", "paymentIntentId": "pi_...", "reused": false }
```

Backend checks:

- `orderId` and positive amount required
- order must exist for requesting user
- requested amount must match order total
- if old intent exists and not canceled, can be reused
- if old intent succeeded -> `409` payment already completed

## Stripe confirmation in frontend

`stripe.confirmPayment` is called with billing details from checkout address.

Success criteria in frontend:

- Stripe intent status is one of:
  - `succeeded`, `processing`, `requires_capture`
- Then polls backend order confirmation every 2s for up to 60s via `fetchOrderConfirmationByExternalId`
- Requires both:
  - payment status `succeeded`
  - order status in `confirmed|processing|shipped|delivered`

## Payment status contract

Frontend mutation:

```graphql
mutation GetPaymentStatus($orderId: String!) {
  getPaymentStatus(orderId: $orderId) {
    status amount currency provider
  }
}
```

Response:

```json
{ "status": "pending|succeeded|failed|cancelled", "amount": 999, "currency": "inr", "provider": "stripe" }
```

Fallback logic in frontend when action fails:

- `cod` -> `not_required`
- `cancelled` order -> `cancelled`
- confirmed/processing/shipped/delivered -> `succeeded`
- else `pending`

## Order history and detail subscriptions

### Order history subscription

```graphql
subscription OrderHistoryRealtime {
  orders(order_by: { created_at: desc }) {
    id order_id status payment_method total created_at
  }
}
```

### Order detail subscription by external order ID

```graphql
subscription OrderDetailRealtime($orderId: String!) {
  orders(where: { order_id: { _eq: $orderId } }, limit: 1) {
    id order_id status payment_method total created_at
    order_items { id product_id title price thumbnail quantity }
    shipping_address: shipping_addresses(limit: 1) {
      full_name phone email address_line1 address_line2 city state pincode
    }
  }
}
```

Param:

```json
{ "orderId": "ORD-..." }
```

## Email notification action (resend confirmation)

Frontend mutation:

```graphql
mutation InvokeEmailLambda($type: String!, $orderId: String!, $email: String!, $payload: jsonb!) {
  invokeEmailLambda(type: $type, orderId: $orderId, email: $email, payload: $payload) {
    success message
  }
}
```

Variables shape:

```json
{
  "type": "confirmation",
  "orderId": "ORD-...",
  "email": "john@example.com",
  "payload": {
    "items": [{ "title": "Product", "quantity": 1, "price": 999 }],
    "total": 999,
    "currency": "INR",
    "paymentMethod": "card",
    "orderDate": "2026-03-10T...Z",
    "expectedDeliveryDate": "2026-03-13T...Z",
    "address": {
      "fullName": "John Doe",
      "phone": "9999999999",
      "email": "john@example.com",
      "addressLine1": "Street 1",
      "addressLine2": "Area",
      "city": "Pune",
      "state": "Maharashtra",
      "pincode": "411001"
    }
  }
}
```

Backend checks:

- type must be one of `confirmation|payment_failed|cancellation`
- `orderId`, `email`, and object `payload` required

Response:

```json
{ "success": true, "message": "Lambda invoked successfully" }
```

## Stripe webhook endpoint (backend)

Endpoint:

- `POST /payments/stripe/webhook`
- backward-compatible: `POST /payments/stripe`

Required header:

- `stripe-signature`

Body:

- raw JSON payload from Stripe (signature-verified)

Webhook logic by event type:

- `payment_intent.succeeded`
  - mark payment succeeded
  - signal Temporal workflow `paymentCompleted`
- `payment_intent.payment_failed`
  - mark payment failed
- `payment_intent.canceled`
  - mark payment cancelled
  - cancel order
  - release pending inventory reservations

Success response:

```json
{ "received": true }
```

## 8) Hasura Custom Types (Action Contracts)

Configured in `internship-backend/hasura-metadata.json`.

### Input objects

- `AuthLoginInput`
  - `firebaseIdToken: String!`
- `IssueHasuraTokenInput`
  - `backendJwt: String!`
- `CreateOrderItemInput`
  - `productId: Int!`
  - `quantity: Int!`
- `CreateOrderAddressInput`
  - `fullName, phone, email, addressLine1, city, state, pincode: String!`
  - `addressLine2: String`
- `CreateStripePaymentIntentInput`
  - `orderId: String!`
  - `amount: numeric!`
  - `currency: String`
- `GetPaymentStatusInput`
  - `orderId: String!`

### Output objects

- `AuthLoginOutput`
  - `token, hasuraToken, user`
- `CreateOrderOutput`
  - `orderId, orderDate, status, orderStatus, paymentStatus, paymentMethod, total`
- `CreateStripePaymentIntentOutput`
  - `clientSecret, paymentIntentId, reused`
- `PaymentStatusOutput`
  - `status, amount, currency, provider`
- `InvokeEmailLambdaOutput`
  - `success, message`

## 9) Data Safety Summary

- Frontend validates user-facing forms with Zod before network requests.
- Critical checkout constraints are re-validated in backend services.
- Backend calculates authoritative prices/subtotals from DB products.
- Inventory checks happen server-side before order creation.
- Idempotency prevents accidental duplicate orders for same checkout attempt.
- Payment status has fallback logic so UI remains stable if payment status API fails.
- Cart/todo have IndexedDB fallback for resilience.

## 10) Notes / Current Gaps

- `CreateOrderItemInput` in Hasura metadata defines only `productId` and `quantity`, while frontend currently sends extra fields (`title`, `price`) in `items` variables. Backend ignores extras; strict schema enforcement may reject extras depending on GraphQL parser behavior.
- `checkoutAddressSchema` currently requires `addressLine2` (min 2), which may be stricter than common address flows.
- `openapi.yaml` includes legacy REST endpoints not used by current frontend commerce flow (current flow is Hasura GraphQL + actions).
