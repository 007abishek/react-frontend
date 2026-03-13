# Feature to File Map

Last updated: 2026-03-09

## Frontend App Shell and Routing

- App entry: `internship-frontend/src/main.tsx`
- Root app component: `internship-frontend/src/App.tsx`
- Router assembly: `internship-frontend/src/app/router/appRouter.tsx`
- Product routes: `internship-frontend/src/app/router/modules/productRoutes.tsx`
- Protected route helper: `internship-frontend/src/app/router/routeHelpers.tsx`
- Protected route component: `internship-frontend/src/components/ProtectedRoute.tsx`
- Layout shell: `internship-frontend/src/components/layout/AppLayout.tsx`
- Navbar: `internship-frontend/src/components/layout/Navbar.tsx`

## Authentication

Frontend:

- Login page: `internship-frontend/src/features/auth/Login.tsx`
- Signup page: `internship-frontend/src/features/auth/Signup.tsx`
- Auth slice: `internship-frontend/src/features/auth/authSlice.ts`
- Auth listener and token exchange: `internship-frontend/src/features/auth/authListener.ts`
- Firebase config: `internship-frontend/src/firebase/config.ts`

Backend:

- Hasura routes: `internship-backend/src/routes/hasura.ts`
- `authLogin` action controller: `internship-backend/src/controllers/hasura/authLogin.action.ts`
- `issueHasuraToken` action controller: `internship-backend/src/controllers/hasura/issueHasuraToken.action.ts`
- Auth service: `internship-backend/src/services/hasura/auth.service.ts`
- JWT claims signer: `internship-backend/src/shared/auth/hasuraToken.ts`
- Hasura secret/session middleware: `internship-backend/src/middleware/hasura.ts`

## Hasura/Apollo Client Layer

- Apollo client setup: `internship-frontend/src/utils/apolloClient.ts`
- Hasura HTTP/WS helper: `internship-frontend/src/utils/hasuraClient.ts`
- Commerce barrel: `internship-frontend/src/features/products/hasuraCommerce.ts`
- Product GraphQL methods: `internship-frontend/src/features/products/hasuraCommerce/products.ts`
- Cart GraphQL methods: `internship-frontend/src/features/products/hasuraCommerce/cart.ts`
- Order GraphQL methods: `internship-frontend/src/features/products/hasuraCommerce/orders.ts`
- Payment GraphQL methods: `internship-frontend/src/features/products/hasuraCommerce/payments.ts`
- Notification GraphQL methods: `internship-frontend/src/features/products/hasuraCommerce/notifications.ts`

## Products

- Product list page: `internship-frontend/src/features/products/ProductsPage.tsx`
- Product detail page: `internship-frontend/src/features/products/ProductDetailPage.tsx`
- RTK Query adapter: `internship-frontend/src/features/products/productApi.ts`

Hasura metadata:

- Products table: `internship-backend/hasura/metadata/databases/default/tables/public_products.yaml`

## Cart

- Cart state: `internship-frontend/src/features/products/cartSlice.ts`
- Cart selectors: `internship-frontend/src/features/products/cartSelectors.ts`
- Cart listener: `internship-frontend/src/features/products/cartListener.ts`
- Cart page: `internship-frontend/src/features/products/CartPage.tsx`
- IndexedDB fallback: `internship-frontend/src/utils/indexedDb.ts`

Hasura metadata:

- Cart table: `internship-backend/hasura/metadata/databases/default/tables/public_cart_items.yaml`

## Checkout and Payment

Frontend:

- Checkout page: `internship-frontend/src/features/products/CheckoutPage.tsx`
- Stripe form: `internship-frontend/src/features/products/StripePaymentForm.tsx`
- Order success page: `internship-frontend/src/features/products/OrderSuccessPage.tsx`

Backend:

- Create order action controller: `internship-backend/src/controllers/hasura/createOrder.action.ts`
- Create Stripe intent action controller: `internship-backend/src/controllers/hasura/createStripePaymentIntent.action.ts`
- Get payment status action controller: `internship-backend/src/controllers/hasura/getPaymentStatus.action.ts`
- Order service: `internship-backend/src/services/hasura/order.service.ts`
- Payment service: `internship-backend/src/services/hasura/payment.service.ts`
- Order model: `internship-backend/src/models/order.model.ts`
- Payment model: `internship-backend/src/models/payment.model.ts`
- Checkout idempotency model: `internship-backend/src/models/checkoutIdempotency.model.ts`

Hasura metadata:

- Orders: `internship-backend/hasura/metadata/databases/default/tables/public_orders.yaml`
- Order items: `internship-backend/hasura/metadata/databases/default/tables/public_order_items.yaml`
- Shipping addresses: `internship-backend/hasura/metadata/databases/default/tables/public_shipping_addresses.yaml`
- Payments: `internship-backend/hasura/metadata/databases/default/tables/public_payments.yaml`

## Inventory and Temporal

- Inventory model (reservation lifecycle): `internship-backend/src/models/inventory.model.ts`
- Temporal client helpers: `internship-backend/src/temporal/client.ts`
- Order workflow: `internship-backend/src/temporal/workflows/orderPlacement.ts`
- Inventory activities: `internship-backend/src/temporal/activities/inventory.activities.ts`
- Order activities: `internship-backend/src/temporal/activities/order.activities.ts`
- Lambda activities: `internship-backend/src/temporal/activities/lambda.activities.ts`

## Stripe Webhook

- Stripe signature middleware: `internship-backend/src/middleware/stripeWebhook.ts`
- Webhook controller: `internship-backend/src/controllers/payment.controller.ts`
- Webhook service: `internship-backend/src/services/payments/webhook.service.ts`
- Stripe config: `internship-backend/src/config/stripe.ts`
- HTTP wiring: `internship-backend/src/index.ts`

## Hasura Events and Email

- Order inserted event controller: `internship-backend/src/controllers/hasura/orderInserted.event.ts`
- Event service (start workflow): `internship-backend/src/services/hasura/event.service.ts`
- Invoke email action controller: `internship-backend/src/controllers/hasura/invokeEmailLambda.action.ts`
- Email lambda service: `internship-backend/src/services/hasura/lambda.service.ts`
- Shared payload types: `internship-backend/src/services/hasura/types.ts`

## Metadata and Flow Docs

- Hasura metadata snapshot: `internship-backend/hasura-metadata.json`
- Project flow doc: `PROJECT_FLOW_DOCUMENTATION.md`
- Frontend-backend flow doc: `FRONTEND_BACKEND_FLOW.md`
- Sequence diagrams: `SEQUENCE_DIAGRAMS.md`
