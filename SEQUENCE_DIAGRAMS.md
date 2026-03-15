# Sequence Diagrams

Last updated: 2026-03-15

## 1. Login and Token Exchange

```mermaid
sequenceDiagram
  actor U as User
  participant FE as Frontend (React)
  participant FB as Firebase Auth
  participant AL as Auth Listener (onAuthStateChanged)
  participant H as Hasura GraphQL (/v1/graphql)
  participant BE as Backend Hasura Action (authLogin)
  participant DB as PostgreSQL

  U->>FE: Login
  FE->>FB: signInWithEmailAndPassword / signInWithPopup / signInWithRedirect
  FB-->>AL: Auth state updated (firebaseUser)
  AL->>FB: firebaseUser.getIdToken()
  FB-->>AL: Firebase ID token
  AL->>H: mutation authLogin(firebaseIdToken)
  H->>BE: POST /hasura/actions/auth-login
  BE->>FB: verifyIdToken
  BE->>DB: upsert users
  BE-->>H: hasuraToken + user
  H-->>FE: action response
  FE->>FE: store hasuraToken in localStorage["jwt"]
  FE->>FE: Apollo adds Authorization: Bearer <jwt>
  FE->>H: query fetchCart (optional)
```

## 1.1 OAuth "Account Exists" Linking (Google/GitHub same email)

```mermaid
sequenceDiagram
  actor U as User
  participant FE as Frontend (React)
  participant FB as Firebase Auth
  participant SS as sessionStorage

  U->>FE: Click "Login with Google/GitHub"
  FE->>FB: signInWithPopup(providerA)
  FB-->>FE: Error auth/account-exists-with-different-credential (+ email)
  FE->>FB: fetchSignInMethodsForEmail(email)
  FB-->>FE: ["google.com" | "github.com" | "password" | ...]
  FE->>FE: Build pending OAuth credential (providerA)
  FE->>SS: Store pending_oauth_link (email + provider + tokens)
  FE-->>U: Prompt: continue with existing method (providerB/password)

  alt User signs in with providerB
    U->>FE: Click providerB login
    FE->>FB: signInWithPopup(providerB)
    FB-->>FE: Signed in (currentUser)
    FE->>SS: Restore pending_oauth_link (if needed)
    FE->>FB: linkWithCredential(currentUser, pendingCredential)
    FB-->>FE: Linked accounts
    FE->>SS: Clear pending_oauth_link
  else User signs in with password
    U->>FE: Enter email + password
    FE->>FB: signInWithEmailAndPassword
    FB-->>FE: Signed in (currentUser)
    FE->>SS: Restore pending_oauth_link (if needed)
    FE->>FB: linkWithCredential(currentUser, pendingCredential)
    FB-->>FE: Linked accounts
    FE->>SS: Clear pending_oauth_link
  end
```

## 1.2 Email Verification Gate (Password logins)

```mermaid
sequenceDiagram
  participant AL as Auth Listener (onAuthStateChanged)
  participant H as Hasura GraphQL (/v1/graphql)
  participant BE as Backend Hasura Action (authLogin)
  participant FB as Firebase Auth
  participant FE as Frontend (React)

  AL->>H: mutation authLogin(firebaseIdToken)
  H->>BE: authLogin action
  BE-->>H: user.emailVerified=false
  H-->>AL: action response
  AL->>AL: set localStorage["pending_otp_verification_email"]
  AL->>FB: signOut()
  FB-->>FE: Logged out
  FE-->>FE: Show "Please verify the OTP..."
```

## 1.3 Signup + OTP Verification (Password)

```mermaid
sequenceDiagram
  actor U as User
  participant FE as Frontend (React)
  participant H as Hasura GraphQL (/v1/graphql)
  participant BE1 as Backend Hasura Action (sendOtp)
  participant BE2 as Backend Hasura Action (verifyOtp)
  participant DB as PostgreSQL
  participant SMTP as Email (SMTP)
  participant FB as Firebase Auth
  participant AL as Auth Listener (onAuthStateChanged)

  U->>FE: Enter email + password
  U->>FE: Click "Send OTP"
  FE->>H: mutation sendOtp(email, purpose="email_verification")
  H->>BE1: POST /hasura/actions/send-otp
  BE1->>DB: store OTP (hash + TTL)
  BE1->>SMTP: send OTP email
  BE1-->>H: success + expiresAt
  H-->>FE: action response

  U->>FE: Enter 6-digit OTP
  U->>FE: Click "Verify & Create Account"
  FE->>H: mutation verifyOtp(email, otp, purpose="email_verification")
  H->>BE2: POST /hasura/actions/verify-otp
  BE2->>DB: verify OTP (+ attempt limits)
  BE2->>DB: best-effort set users.email_verified=true
  BE2-->>H: success
  H-->>FE: action response

  FE->>FB: createUserWithEmailAndPassword(email, password)
  FB-->>AL: Auth state updated (firebaseUser)
  Note over AL,H: AL then runs authLogin (see diagram 1)
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
