tech stack design

1.) postgresql -> single DB
2.) Hasura -> GraphQl Layer
3.) Node backend -> business logic
4.) Temporal -> orchestration
5.) Docker -> local infra 
(for scalable , efficient)

🛒 E-Commerce Backend Architecture
Modular Monolith + Temporal Orchestration
📌 Project Overview

This backend powers a full e-commerce workflow including:

Product management

Cart management

Order processing

Inventory reservation

Payment handling

Role-based access control (Admin/User)

The system is designed using:

PostgreSQL → Source of truth

Hasura → GraphQL engine + RBAC + subscriptions

Temporal → Durable workflow orchestration

AWS Lambda → External integrations (Payment simulation)

Docker → Local infrastructure setup
```
🏗 Architecture Overview
Frontend (React)
        ↓
Hasura (GraphQL + RBAC)
        ↓
PostgreSQL (Primary Database)
        ↓
Hasura Action → AWS Lambda
        ↓
Temporal Workflow
        ↓
Temporal Worker (Activities)
        ↓
PostgreSQL
```


🛍 Product Management

Products are initially seeded from DummyJSON.

After seeding:

PostgreSQL becomes the source of truth.

Admin can:

Increase stock

Decrease stock

Update price

Add new products
⏳ Order Processing Workflow (Temporal)
Workflow: OrderWorkflow

Steps:

Create Order (PENDING)

Reserve Inventory

Process Payment

If success → Confirm Order

If failure → Release Inventory

Inventory Reservation Logic

Safe concurrency:

UPDATE products
SET stock = stock - $quantity
WHERE id = $productId
AND stock >= $quantity;


If rows affected = 0 → fail workflow.

Saga Pattern Implementation

If payment fails:

Release reserved stock

Update order to CANCELLED

This ensures data consistency.

🔄 Real-Time Order Updates

Frontend subscribes using Hasura:

subscription {
  orders_by_pk(id: $orderId) {
    status
    payment_status
  }
}


When workflow updates DB → UI updates automatically.

⚙️ Docker Infrastructure

Services:

postgres

hasura

temporal server

temporal UI

backend service

lambda service

This provides local production-like setup.

📈 Scalability Strategy
Horizontal Scaling

Hasura replicas

Temporal workers scale independently

Lambda auto-scales

PostgreSQL read replicas (future)

Future Evolution Path

Stage 1 → Modular Monolith
Stage 2 → Scale Temporal workers
Stage 3 → Extract inventory/payment into microservices if needed

Architecture is designed to support evolution without major refactor