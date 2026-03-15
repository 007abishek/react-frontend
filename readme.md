# Talview Internship Monorepo



## Overview


- `internship-frontend`: React client (Firebase auth, Hasura GraphQL, Stripe Elements)
- `internship-backend`: Express backend (Hasura actions/events, Stripe webhook, Temporal workflows)

Core architecture:

1. Frontend calls Hasura GraphQL for tables and custom actions.
2. Hasura actions/events call backend endpoints.
3. Backend coordinates DB writes, Stripe lifecycle, and Temporal workflows.

## Current Backend Model Structure

The backend intentionally uses a feature-oriented model layer (old structure):

- `src/models/inventory.model.ts`
- `src/models/order.model.ts`
- `src/models/payment.model.ts`
- `src/models/checkoutIdempotency.model.ts`
.

## Key Documentation Files

- `FEATURE_TO_FILE_MAP.md`: file ownership by feature
- `PROJECT_FLOW_DOCUMENTATION.md`: complete end-to-end functional flow
- `FRONTEND_BACKEND_FLOW.md`: concise request/response flow map
- `SEQUENCE_DIAGRAMS.md`: Mermaid sequence diagrams

## Quick Start

### 1. Backend

```bash
cd internship-backend
npm install
npm run migrate
npm run seed
npm run dev
```

Optional full stack bootstrap (Docker + metadata restore):

```bash
npm run docker:bootstrap
```

### 2. Temporal worker

```bash
cd internship-backend
npm run worker
```

### 3. Frontend

```bash
cd internship-frontend
npm install
npm run dev
```

## Important Backend Endpoints

- `POST /hasura/actions/auth-login`
- `POST /hasura/actions/create-order`
- `POST /hasura/actions/create-stripe-payment-intent`
- `POST /hasura/actions/get-payment-status`
- `POST /hasura/actions/invoke-email-lambda`
- `POST /hasura/events/order-inserted`
- `POST /payments/stripe/webhook`
- `POST /payments/stripe` (legacy compatible)
- `GET /health`

## Hasura Metadata and Seeds

- Metadata snapshot: `internship-backend/hasura-metadata.json`
- Modular metadata YAML: `internship-backend/hasura/metadata/...`
- Seed SQL folder: `internship-backend/hasura/seeds/default`

## Notes

- Hasura action/event secrets are enforced in backend middleware.
- Stripe webhook signature verification is handled before controller execution.
- Idempotency cleanup cron runs in backend startup (`src/index.ts`).
- Frontend uses a single persisted token for Hasura: `localStorage["jwt"]` (set from backend `authLogin.hasuraToken`).
