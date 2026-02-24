# Bruno Collection Notes

Set these collection variables before running requests:
- baseUrl = http://localhost:3001
- firebaseIdToken = <firebase id token from frontend login>
- jwt = <backend JWT from /auth/login response>
- orderId = <order_id string from /orders response, e.g. ORD-...>
- paymentIntentId = <Stripe PaymentIntent id from /payments/stripe/intent>

Suggested execution order (Stripe):
1) Firebase Login
2) 02 Create Order
3) 05 Stripe Intent
4) 06 Stripe Confirm
5) 08 Payment Status
6) 03 Get Orders / 04 Get Order By Id

Suggested execution order (COD):
1) Firebase Login
2) 02 Create Order (paymentMethod = "cod")
3) 07 COD Confirm
4) 08 Payment Status
