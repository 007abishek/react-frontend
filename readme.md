#  Backend

ecommerce application.
Built with a ** modular monolith** architecture.

---

## 📋 Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [ER Diagram](#er-diagram)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Auth Flow](#auth-flow)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Testing with Bruno](#testing-with-bruno)
- [Roadmap](#roadmap)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
│   React + Redux + RTK Query + Firebase SDK                      │
│                                                                  │
│   Login.tsx ──► Firebase Auth ──► authListener.ts               │
│   ProductsPage.tsx ──► productApi.ts (RTK Query)                │
│   CartPage.tsx ──► cartSlice.ts (Redux)                         │
└────────────────────────┬────────────────────────────────────────┘
                         │  HTTP (REST)
                         │  Authorization: Bearer <jwt>
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXPRESS API  :3001                            │
│                                                                  │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│   │  /auth   │  │/products │  │  /cart   │  │ /orders  │      │
│   └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
│        │              │              │              │            │
│   ┌────▼──────────────▼──────────────▼──────────────▼────┐     │
│   │              Middleware Layer                          │     │
│   │   helmet │ cors │ morgan │ authenticate │ rateLimit   │     │
│   └────────────────────────────────────────────────────────┘    │
│        │                                                         │
│   ┌────▼───────────────────────────────────────────────────┐    │
│   │              Service / Model Layer                      │    │
│   │   UserModel │ ProductModel │ CartModel │ OrderModel     │    │
│   └────────────────────────────────────────────────────────┘    │
└──────────┬──────────────────────────────┬───────────────────────┘
           │                              │
           ▼                              ▼
┌─────────────────────┐      ┌───────────────────────┐
│   PostgreSQL :5432  │      │  Firebase Admin SDK    │
│                     │      │                        │
│   users             │      │  verifyIdToken()       │
│   products          │      │  Google OAuth          │
│   cart_items        │      │  GitHub OAuth          │
│   orders            │      │  Email/Password        │
│   order_items       │      │  Anonymous             │
│   payments          │      └───────────────────────┘
└─────────────────────┘
           │
           ▼
┌─────────────────────┐      ┌───────────────────────┐
│    Hasura :8080     │      │   Temporal (Phase 6)   │
│  GraphQL Layer      │      │                        │
│  Row-level perms    │      │  order-workflow        │
│  Event triggers ────┼─────►│  payment-retry         │
│  Relationships      │      │  inventory-release     │
└─────────────────────┘      └───────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Runtime | Node.js 20 Alpine | Server runtime |
| Framework | Express + TypeScript | REST API + type safety |
| Database | PostgreSQL 16 | Primary data store |
| Auth Provider | Firebase Admin SDK | Token verification |
| Token | JWT (jsonwebtoken) | API authorization |
| GraphQL | Hasura | GraphQL layer over Postgres |
| Workflows | Temporal | Durable workflow orchestration |
| Containers | Docker Compose | Local infrastructure |
| Monitoring | Sentry | Error tracking |

---

## 🗃️ ER Diagram

```
┌─────────────────────┐
│        USERS        │
├─────────────────────┤
│ id (PK)             │◄──────────────────────────┐
│ firebase_uid UNIQUE │                            │
│ email UNIQUE        │                            │
│ provider            │                            │
│ is_guest            │                            │
│ created_at          │                            │
└──────────┬──────────┘                            │
           │ 1                                     │
           │                                       │
    ───────┼───────────────────────────────────    │
    │                                      │       │
    │ N                                    │ N     │
    ▼                                      ▼       │
┌──────────────────┐            ┌──────────────────┤
│   CART_ITEMS     │            │     ORDERS       │
├──────────────────┤            ├──────────────────┤
│ id (PK)          │            │ id (PK)          │
│ user_id (FK)─────┘            │ user_id (FK)─────┘
│ product_id (FK)──┐            │ firebase_uid     │
│ title            │            │ status           │
│ price            │            │ payment_method   │
│ thumbnail        │            │ subtotal         │
│ images[]         │            │ total            │
│ quantity         │            │ created_at       │
│ created_at       │            └────────┬─────────┘
│ updated_at       │                     │ 1
└──────────────────┘                     │
           │                             │ N
           │ N                           ▼
           ▼                  ┌──────────────────────┐
┌──────────────────┐          │     ORDER_ITEMS      │
│     PRODUCTS     │          ├──────────────────────┤
├──────────────────┤          │ id (PK)              │
│ id (PK)          │◄─────────│ order_id (FK)        │
│ external_id      │    N     │ product_id (FK)──────┘
│ title            │          │ title (snapshot)     │
│ description      │          │ price (snapshot)     │
│ price            │          │ quantity             │
│ category         │          │ thumbnail            │
│ thumbnail        │          └──────────────────────┘
│ images[]         │
│ rating           │          ┌──────────────────────┐
│ stock            │          │   SHIPPING_ADDRESSES │
│ brand            │          ├──────────────────────┤
│ created_at       │          │ id (PK)              │
└──────────────────┘          │ order_id (FK)        │
                              │ full_name            │
                              │ phone                │
                              │ email                │
                              │ address_line1        │
                              │ address_line2        │
                              │ city                 │
                              │ state                │
                              │ pincode              │
                              └──────────────────────┘

                              ┌──────────────────────┐
                              │      PAYMENTS        │
                              ├──────────────────────┤
                              │ id (PK)              │
                              │ order_id (FK)        │
                              │ user_id (FK)         │
                              │ provider             │
                              │ (stripe/razorpay/cod)│
                              │ amount               │
                              │ currency             │
                              │ status               │
                              │ provider_order_id    │
                              │ provider_payment_id  │
                              │ created_at           │
                              └──────────────────────┘
```

---

## 📁 Project Structure

```
internship-backend/
├── src/
│   ├── config/
│   │   ├── db.ts              # PostgreSQL pool + table init
│   │   └── firebase.ts        # Firebase Admin SDK init
│   ├── controllers/
│   │   ├── products.controller.ts
│   │   └── (cart, orders, payments coming)
│   ├── middleware/
│   │   └── auth.ts            # JWT verify + AuthRequest type
│   ├── models/
│   │   ├── product.model.ts   # DB queries for products
│   │   └── (cart, order models coming)
│   ├── routes/
│   │   ├── auth.ts            # /auth/* endpoints
│   │   └── products.ts        # /products/* endpoints
│   ├── scripts/
│   │   └── seedProducts.ts    # DummyJSON → Postgres seeder
│   └── index.ts               # Express app entry point
├── .env                       # Environment variables
├── .env.example               # Template for new devs
├── Dockerfile                 # Node 20 Alpine container
├── docker-compose.yml         # Postgres + API services
├── tsconfig.json              # TypeScript config
└── package.json               # Dependencies + scripts
```

---

## 🔌 API Endpoints

### Auth `/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /auth/login | Public | Firebase token → Backend JWT |
| GET | /auth/me | 🔒 Bearer | Get current user from JWT |
| GET | /health | Public | Health check |

### Products `/products`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /products | Public | Get all products |
| GET | /products/:id | Public | Get single product |
| GET | /products/category/:name | Public | Filter by category |
| GET | /products/search?q= | Public | Search by title |
| GET | /products/top-rated?minRating= | Public | Filter by rating |

### Cart `/cart` *(Phase 3)*

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /cart | 🔒 Bearer | Get user cart |
| POST | /cart | 🔒 Bearer | Add item to cart |
| PUT | /cart/:id | 🔒 Bearer | Update quantity |
| DELETE | /cart/:id | 🔒 Bearer | Remove item |
| DELETE | /cart | 🔒 Bearer | Clear cart |

### Orders `/orders` *(Phase 4)*

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /orders | 🔒 Bearer | Place order |
| GET | /orders | 🔒 Bearer | Order history |
| GET | /orders/:id | 🔒 Bearer | Order detail |

### Payments *(Phase 5)*

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /payments/razorpay/order | 🔒 Bearer | Create Razorpay order |
| POST | /payments/razorpay/verify | 🔒 Bearer | Verify payment |
| POST | /payments/stripe/intent | 🔒 Bearer | Create Stripe intent |
| POST | /payments/stripe/confirm | 🔒 Bearer | Confirm payment |
| POST | /payments/cod/confirm | 🔒 Bearer | Cash on delivery |

---

## 🔐 Auth Flow

```
EMAIL / PASSWORD:
  1. Firebase: signInWithEmailAndPassword()
  2. Firebase: checks emailVerified = true
  3. Frontend: firebaseUser.getIdToken()
  4. Frontend: POST /auth/login { firebaseIdToken }
  5. Backend:  admin.auth().verifyIdToken()
  6. Backend:  INSERT INTO users ... ON CONFLICT DO UPDATE
  7. Backend:  jwt.sign({ userId, email, provider })
  8. Frontend: localStorage.setItem('jwt', token)

GOOGLE / GITHUB:
  1. Firebase: signInWithPopup(googleProvider)
  2. Firebase: handles OAuth redirect
  3. Frontend: firebaseUser.getIdToken()
  4. Frontend: POST /auth/login { firebaseIdToken }
  5. Backend:  verifyIdToken → sign_in_provider = 'google.com'
  6. Backend:  upsert user, sign JWT
  7. Frontend: localStorage.setItem('jwt', token)

GUEST:
  1. Firebase: signInAnonymously()
  2. Frontend: POST /auth/login { firebaseIdToken }
  3. Backend:  provider = 'guest', isGuest = true
  4. JWT issued (cart NOT loaded for guests)
```

---

## 🚀 Getting Started

### Prerequisites
- Docker Desktop
- Node.js 20+
- Firebase project with Admin SDK credentials

### 1. Clone & Configure

```bash
cd internship-backend
cp .env.example .env
# Fill in Firebase credentials and JWT secret
```

### 2. Start Services

```bash
docker compose up --build
```

### 3. Seed Products

```bash
docker exec -it ecom_api npx ts-node src/scripts/seedProducts.ts
```

### 4. Verify

```bash
curl http://localhost:3001/health
# { "status": "ok" }

curl http://localhost:3001/products
# { "products": [...], "total": 46 }
```

---

## ⚙️ Environment Variables

```env
# PostgreSQL
POSTGRES_URL=postgres://ecom_user:ecom_pass@postgres:5432/ecom_db

# JWT
JWT_SECRET=your_super_secret_key_min_32_chars

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nYOUR_KEY\n-----END RSA PRIVATE KEY-----\n"

# App
PORT=3001
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

---

## 🧪 Testing with Bruno

Import collection from `/bruno` folder.

Set environment variable:
```
baseUrl = http://localhost:3001
jwt     = (paste from login response)
```

---

