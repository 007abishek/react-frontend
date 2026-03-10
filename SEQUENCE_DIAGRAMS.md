# Sequence Diagrams

Last updated: 2026-03-09

## 1. Login and Token Exchange

```mermaid
sequenceDiagram
  actor U as User
  participant FE as Frontend (React)
  participant FB as Firebase Auth
  participant H as Hasura GraphQL
  participant BE as Backend /hasura/actions
  participant DB as PostgreSQL

  U->>FE: Login
  FE->>FB: Firebase sign-in
  FB-->>FE: Firebase ID token
  FE->>H: mutation authLogin(firebaseIdToken)
  H->>BE: POST /hasura/actions/auth-login
  BE->>FB: verifyIdToken
  BE->>DB: upsert users
  BE-->>H: unified token + user
  H-->>FE: action response
  FE->>FE: store jwt and set Hasura auth
```

## 2. Product Browse and Cart Sync

```mermaid
sequenceDiagram
  actor U as User
  participant FE as Frontend
  participant H as Hasura
  participant DB as PostgreSQL
  participant IDB as IndexedDB

  U->>FE: Open /products
  FE->>H: query products
  H->>DB: select products
  H-->>FE: product list

  U->>FE: Update cart
  FE->>H: mutation cart_items
  H->>DB: upsert/delete cart rows
  H-->>FE: success

  alt sync fails
    FE->>IDB: persist fallback cart
  end
```

## 3. Checkout Create Order

```mermaid
sequenceDiagram
  actor U as User
  participant FE as CheckoutPage
  participant H as Hasura
  participant BE as Backend create-order action
  participant DB as PostgreSQL

  U->>FE: Submit checkout
  FE->>H: mutation createOrder
  H->>BE: POST /hasura/actions/create-order
  BE->>BE: validate input and stock
  BE->>DB: idempotency check
  BE->>DB: cancel stale pending attempts
  BE->>DB: insert order graph
  BE->>DB: clear cart
  BE-->>H: order response
  H-->>FE: action result
```

## 4. Hasura Event to Temporal

```mermaid
sequenceDiagram
  participant H as Hasura Event Trigger
  participant BE as Backend /hasura/events
  participant DB as PostgreSQL
  participant T as Temporal

  H->>BE: POST /hasura/events/order-inserted
  BE->>DB: fetch workflow payload
  BE->>T: start orderPlacementWorkflow(order-{orderId})
  T-->>BE: started or already running
  BE-->>H: received
```

## 5. Stripe Card Payment

```mermaid
sequenceDiagram
  actor U as User
  participant FE as Frontend (Stripe Elements)
  participant H as Hasura
  participant BE as Backend
  participant S as Stripe
  participant DB as PostgreSQL
  participant T as Temporal

  U->>FE: Choose card payment
  FE->>H: mutation createStripePaymentIntent
  H->>BE: POST /hasura/actions/create-stripe-payment-intent
  BE->>S: create/reuse PaymentIntent
  BE->>DB: save payment info
  BE-->>H: clientSecret + paymentIntentId
  H-->>FE: action response

  U->>FE: Confirm card details
  FE->>S: confirmPayment
  S->>BE: webhook payment_intent.succeeded
  BE->>DB: update payment status
  BE->>T: signal paymentCompleted

  FE->>H: mutation getPaymentStatus
  H->>BE: POST /hasura/actions/get-payment-status
  BE->>DB: read order/payment state
  BE-->>H: status
  H-->>FE: status
```

## 6. Workflow Success and Failure

```mermaid
sequenceDiagram
  participant T as Temporal order workflow
  participant A as Activities
  participant DB as PostgreSQL
  participant L as AWS Lambda

  T->>A: reserveInventory
  T->>A: initiate or wait payment

  alt success
    T->>A: confirmInventory
    T->>A: confirmOrder
    T->>A: updatePaymentStatus(succeeded)
    T->>L: send confirmation email
  else timeout/failure
    T->>A: releaseInventory
    T->>A: rollbackOrder(cancelled)
    T->>A: updatePaymentStatus(cancelled/failed)
    T->>L: send failure email
  end
```

## 7. Realtime Order History

```mermaid
sequenceDiagram
  actor U as User
  participant FE as Frontend
  participant HWS as Hasura GraphQL WS
  participant DB as PostgreSQL
  participant BE as Backend get-payment-status action

  U->>FE: Open /orders or /orders/:orderId
  FE->>HWS: start subscription
  HWS->>DB: stream rows by user
  HWS-->>FE: live updates

  FE->>BE: optional status reconciliation
  BE->>DB: read latest payment row
  BE-->>FE: payment status
```
