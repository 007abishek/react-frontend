# Sequence Diagrams

## 1. Login and Token Exchange

```mermaid
sequenceDiagram
  actor U as User
  participant FE as Frontend (React)
  participant FB as Firebase Auth
  participant H as Hasura GraphQL
  participant BE as Backend /hasura/actions
  participant DB as PostgreSQL

  U->>FE: Login (email/google/github/guest)
  FE->>FB: Sign-in request
  FB-->>FE: Firebase session + ID token
  FE->>H: mutation authLogin(firebaseIdToken)
  H->>BE: POST /hasura/actions/auth-login
  BE->>FB: verifyIdToken()
  BE->>DB: upsert users
  BE-->>H: backend JWT + hasura JWT + user
  H-->>FE: action response
  FE->>FE: store jwt + hasura_jwt
  FE->>H: query cart_items (authenticated)
  H->>DB: select cart_items by X-Hasura-User-Id
  H-->>FE: cart data
```

## 2. Product Browsing and Cart Sync

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

  U->>FE: Add/Update cart
  FE->>FE: cartSlice state update
  FE->>H: mutation sync cart_items
  H->>DB: delete+insert user cart rows
  H-->>FE: success

  alt Hasura cart sync fails
    FE->>IDB: saveCartForUser()
  end
```

## 3. Checkout (Create Order)

```mermaid
sequenceDiagram
  actor U as User
  participant FE as CheckoutPage
  participant H as Hasura
  participant BE as Backend create-order action
  participant DB as PostgreSQL

  U->>FE: Submit checkout (address/payment/review)
  FE->>H: mutation createOrder(...)
  H->>BE: POST /hasura/actions/create-order
  BE->>BE: validate session/input/stock
  BE->>DB: idempotency check (checkout_idempotency)
  BE->>DB: cancel previous pending order attempts
  BE->>DB: insert orders + order_items + shipping_addresses
  BE->>DB: clear cart_items
  BE-->>H: orderId/status/paymentStatus
  H-->>FE: action response
```

## 4. Hasura Event -> Temporal Workflow Start

```mermaid
sequenceDiagram
  participant H as Hasura Event Trigger
  participant BE as Backend /hasura/events
  participant DB as PostgreSQL
  participant T as Temporal

  H->>BE: POST /hasura/events/order-inserted
  BE->>DB: read workflow payload by order_id
  BE->>T: start orderPlacementWorkflow(order-{orderId})
  T-->>BE: started/already-started
  BE-->>H: received=true
```

## 5. Card Payment (Stripe)

```mermaid
sequenceDiagram
  actor U as User
  participant FE as Frontend (Stripe Elements)
  participant H as Hasura
  participant BE as Backend action+webhook
  participant S as Stripe
  participant DB as PostgreSQL
  participant T as Temporal

  U->>FE: Choose Card and proceed
  FE->>H: mutation createStripePaymentIntent(orderId, amount)
  H->>BE: POST /hasura/actions/create-stripe-payment-intent
  BE->>S: create/retrieve PaymentIntent
  BE->>DB: persist payment intent info
  BE-->>H: clientSecret + paymentIntentId
  H-->>FE: action response

  U->>FE: Enter card and confirm
  FE->>S: confirmPayment(clientSecret)
  S-->>FE: succeeded/processing

  S->>BE: webhook payment_intent.succeeded
  BE->>DB: update payment status
  BE->>T: signal paymentCompleted(order workflow)

  FE->>H: poll getPaymentStatus(orderId)
  H->>BE: POST /hasura/actions/get-payment-status
  BE->>DB: read order/payment
  BE-->>H: payment status
  H-->>FE: succeeded
  FE-->>U: Navigate to /order-success
```

## 6. Workflow Success/Failure Path

```mermaid
sequenceDiagram
  participant T as Temporal orderPlacementWorkflow
  participant A as Activities
  participant DB as PostgreSQL
  participant L as AWS Lambda

  T->>A: validateInventory
  T->>A: reserveInventory (5 min hold)
  T->>A: initiatePayment (or COD pending record)

  alt payment completed (or COD)
    T->>A: confirmInventory
    T->>A: confirmOrder
    T->>A: updatePaymentStatusByOrder (COD->succeeded)
    T->>L: send confirmation email
  else timeout/failure
    T->>A: releaseInventory
    T->>A: rollbackOrder (cancelled)
    T->>A: updatePaymentStatusByOrder(cancelled)
    T->>L: send payment_failed email
  end
```

## 7. Order History and Detail Realtime

```mermaid
sequenceDiagram
  actor U as User
  participant FE as Frontend
  participant HWS as Hasura GraphQL WS
  participant DB as PostgreSQL
  participant BE as Backend get-payment-status action

  U->>FE: Open /orders or /orders/:orderId
  FE->>HWS: Start GraphQL subscription
  HWS->>DB: stream order/order_item/address rows by user
  HWS-->>FE: realtime updates

  FE->>BE: (when needed) getPaymentStatus(orderId)
  BE->>DB: read payments
  BE-->>FE: status enrichment
```
