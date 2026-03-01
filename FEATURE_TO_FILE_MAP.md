# Feature to File Map

## App Entry, Routing, and Shared Shell

- App bootstrap/providers: `internship-frontend/src/main.tsx`
- Route definitions: `internship-frontend/src/App.tsx`
- Auth gate for protected pages: `internship-frontend/src/components/ProtectedRoute.tsx`
- Global layout: `internship-frontend/src/components/layout/AppLayout.tsx`
- Top nav (cart badge, logout): `internship-frontend/src/components/layout/Navbar.tsx`

## Authentication

- Login UI: `internship-frontend/src/features/auth/Login.tsx`
- Signup UI: `internship-frontend/src/features/auth/Signup.tsx`
- Auth Redux state: `internship-frontend/src/features/auth/authSlice.ts`
- Firebase auth listener + token exchange + cart load: `internship-frontend/src/features/auth/authListener.ts`
- Firebase config/providers: `internship-frontend/src/firebase/config.ts`

Backend side:

- Hasura auth action route wiring: `internship-backend/src/routes/hasura.ts`
- `authLogin` controller: `internship-backend/src/controllers/hasura/authLogin.action.ts`
- `issueHasuraToken` controller: `internship-backend/src/controllers/hasura/issueHasuraToken.action.ts`
- Auth service + JWT issuance: `internship-backend/src/services/hasura/auth.service.ts`
- Hasura claims JWT signer: `internship-backend/src/shared/auth/hasuraToken.ts`

## Hasura/Apollo Client Layer

- Apollo client setup: `internship-frontend/src/utils/apolloClient.ts`
- Hasura request helper + token refresh + subscriptions WS: `internship-frontend/src/utils/hasuraClient.ts`
- Commerce GraphQL methods (queries/actions/subscriptions): `internship-frontend/src/features/products/hasuraCommerce.ts`

## Products

- Product list page: `internship-frontend/src/features/products/ProductsPage.tsx`
- Product detail page: `internship-frontend/src/features/products/ProductDetailPage.tsx`
- Product data API (RTK Query wrapper): `internship-frontend/src/features/products/productApi.ts`

Hasura metadata:

- Products permissions: `internship-backend/hasura/metadata/databases/default/tables/public_products.yaml`

## Cart

- Cart state: `internship-frontend/src/features/products/cartSlice.ts`
- Cart selectors: `internship-frontend/src/features/products/cartSelectors.ts`
- Cart page UI: `internship-frontend/src/features/products/CartPage.tsx`
- Cart sync middleware: `internship-frontend/src/features/products/cartListener.ts`
- Offline fallback persistence: `internship-frontend/src/utils/indexedDb.ts`

Hasura metadata:

- Cart table permissions: `internship-backend/hasura/metadata/databases/default/tables/public_cart_items.yaml`

## Checkout and Payments

- Checkout wizard (address/payment/review/stripe): `internship-frontend/src/features/products/CheckoutPage.tsx`
- Stripe card form and confirmation polling: `internship-frontend/src/features/products/StripePaymentForm.tsx`
- Order success page + resend email: `internship-frontend/src/features/products/OrderSuccessPage.tsx`

Backend side:

- Create order controller: `internship-backend/src/controllers/hasura/createOrder.action.ts`
- Create Stripe intent controller: `internship-backend/src/controllers/hasura/createStripePaymentIntent.action.ts`
- Get payment status controller: `internship-backend/src/controllers/hasura/getPaymentStatus.action.ts`
- Order service (validation, idempotency, inserts): `internship-backend/src/services/hasura/order.service.ts`
- Payment service (intent reuse/create, status): `internship-backend/src/services/hasura/payment.service.ts`
- Order persistence model: `internship-backend/src/models/order.model.ts`
- Payment persistence model: `internship-backend/src/models/payment.model.ts`
- Checkout idempotency model: `internship-backend/src/models/checkoutIdempotency.model.ts`

Hasura metadata:

- Orders: `internship-backend/hasura/metadata/databases/default/tables/public_orders.yaml`
- Order items: `internship-backend/hasura/metadata/databases/default/tables/public_order_items.yaml`
- Shipping addresses: `internship-backend/hasura/metadata/databases/default/tables/public_shipping_addresses.yaml`
- Payments: `internship-backend/hasura/metadata/databases/default/tables/public_payments.yaml`

## Realtime Orders (History/Detail)

- Order history page: `internship-frontend/src/features/products/OrderHistoryPage.tsx`
- Order detail page: `internship-frontend/src/features/products/OrderDetailPage.tsx`
- Generic subscription hook: `internship-frontend/src/hooks/useHasuraSubscription.ts`

## Hasura Actions and Events

- Hasura action/event route registration: `internship-backend/src/routes/hasura.ts`
- Hasura secret/session middleware: `internship-backend/src/middleware/hasura.ts`
- Hasura helper parsing/validation: `internship-backend/src/controllers/hasura/helpers.ts`
- Order inserted event controller: `internship-backend/src/controllers/hasura/orderInserted.event.ts`
- Event service (starts workflow): `internship-backend/src/services/hasura/event.service.ts`

Metadata source:

- Exported metadata: `internship-backend/hasura-metadata.json`

## Stripe Webhook

- Stripe signature verification middleware: `internship-backend/src/middleware/stripeWebhook.ts`
- Webhook controller: `internship-backend/src/controllers/payment.controller.ts`
- Webhook processing service: `internship-backend/src/services/payments/webhook.service.ts`
- Stripe config: `internship-backend/src/config/stripe.ts`

## Temporal Workflow and Inventory

- Temporal client/start/cancel helpers: `internship-backend/src/temporal/client.ts`
- Main order workflow: `internship-backend/src/temporal/workflows/orderPlacement.ts`
- Order/inventory/payment activities: `internship-backend/src/temporal/activities/order.activities.ts`
- Lambda email activity: `internship-backend/src/temporal/activities/lambda.activities.ts`
- Inventory model: `internship-backend/src/models/inventory.model.ts`

## Email Lambda

- Invoke-email action controller: `internship-backend/src/controllers/hasura/invokeEmailLambda.action.ts`
- Invoke-email service: `internship-backend/src/services/hasura/lambda.service.ts`
- Payload/type definitions: `internship-backend/src/services/hasura/types.ts`
