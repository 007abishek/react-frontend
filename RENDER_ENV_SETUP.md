# Render Environment Setup (Backend + Worker + Frontend)

Use this document to fill environment variables in Render and your frontend host.

## 1) Backend API service (`internship-backend-api`)

Set these in Render -> Service -> `Environment`:

| Key | Example / Format | Where to get |
|---|---|---|
| `NODE_ENV` | `production` | fixed |
| `ENFORCE_HTTPS_PAYMENTS` | `true` | fixed |
| `PORT` | `3001` | fixed (Render can also auto-manage) |
| `FRONTEND_ORIGINS` | `https://your-frontend-domain.com` | your deployed frontend URL |
| `POSTGRES_URL` | `postgres://user:pass@host:5432/db` | Render Postgres -> Internal Database URL |
| `TEMPORAL_ADDRESS` | `your-namespace.tmprl.cloud:7233` | Temporal Cloud / self-hosted Temporal endpoint |
| `TEMPORAL_NAMESPACE` | `default` | your Temporal namespace |
| `TEMPORAL_TASK_QUEUE` | `ecommerce-orders` | must match worker queue |
| `INVENTORY_CLEANUP_CRON_SCHEDULE` | `* * * * *` | cron schedule for Temporal sweep |
| `HASURA_JWT_SECRET` | long random string | you create this; must match Hasura JWT config key |
| `HASURA_ACTION_SECRET` | long random string | you create this; used by Hasura action headers |
| `HASURA_EVENT_SECRET` | long random string | you create this; used by Hasura event headers |
| `STRIPE_SECRET_KEY` | `sk_test_...` / `sk_live_...` | Stripe Dashboard -> Developers -> API keys |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_...` / `pk_live_...` | Stripe Dashboard -> Developers -> API keys |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Stripe Dashboard -> Webhooks -> endpoint signing secret |
| `FIREBASE_PROJECT_ID` | `your-project-id` | Firebase service account JSON -> `project_id` |
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-...@...iam.gserviceaccount.com` | Firebase service account JSON -> `client_email` |
| `FIREBASE_PRIVATE_KEY` | `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n` | Firebase service account JSON -> `private_key` (escape newlines as `\n`) |
| `AWS_REGION` | `ap-southeast-2` | AWS account/region |
| `AWS_ACCESS_KEY_ID` | `AKIA...` | AWS IAM user/access key |
| `AWS_SECRET_ACCESS_KEY` | secret value | AWS IAM user/access key |
| `EMAIL_LAMBDA_FUNCTION_NAME` | lambda name | AWS Lambda function name |

## 2) Backend Worker service (`internship-backend-worker`)

Set the same values as API for all shared keys:

- `NODE_ENV`
- `POSTGRES_URL`
- `TEMPORAL_ADDRESS`
- `TEMPORAL_NAMESPACE`
- `TEMPORAL_TASK_QUEUE`
- `INVENTORY_CLEANUP_CRON_SCHEDULE`
- `HASURA_JWT_SECRET`
- `HASURA_ACTION_SECRET`
- `HASURA_EVENT_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `EMAIL_LAMBDA_FUNCTION_NAME`

## 3) Frontend host variables

Set these in your frontend hosting provider:

| Key | Example / Format | Where to get |
|---|---|---|
| `VITE_HASURA_URL` | `https://your-hasura-domain/v1/graphql` | Hasura endpoint |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` / `pk_live_...` | Stripe Dashboard |
| `VITE_FIREBASE_API_KEY` | Firebase web config | Firebase Console -> Project settings -> Web app config |
| `VITE_FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` | Firebase web config |
| `VITE_FIREBASE_PROJECT_ID` | `your-project-id` | Firebase web config |
| `VITE_FIREBASE_STORAGE_BUCKET` | `your-project.appspot.com` | Firebase web config |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | sender id | Firebase web config |
| `VITE_FIREBASE_APP_ID` | app id | Firebase web config |
| `VITE_SENTRY_ENABLED` | `false` or `true` | optional |
| `VITE_SENTRY_DSN` | DSN string | optional (Sentry project) |

## 4) Stripe webhook endpoint

Create webhook in Stripe:

- Endpoint URL: `https://<your-backend-api-domain>/payments/stripe/webhook`
- Copy signing secret to `STRIPE_WEBHOOK_SECRET`

## 5) Hasura must-match settings

1. `HASURA_JWT_SECRET` (backend env) must match Hasura JWT config key.
2. Hasura Action header secret must match backend `HASURA_ACTION_SECRET`.
3. Hasura Event Trigger header secret must match backend `HASURA_EVENT_SECRET`.

### Hasura JWT config example

```json
{
  "type": "HS256",
  "key": "PASTE_THE_SAME_HASURA_JWT_SECRET_HERE"
}
```

## 6) Final quick checks

1. API health: `https://<api-domain>/health` returns `{"status":"ok"}`.
2. Worker logs include `Temporal Worker started`.
3. Signup/login works.
4. COD order works.
5. Card payment and webhook update work.
