import { hasuraRequest, subscribeHasura, type Unsubscribe } from "../../utils/hasuraClient";

import type { Product } from "./types";
import type { CartItem } from "./cartSlice";

type ProductRow = Product;

type CartItemRow = {
  id: number;
  product_id: number;
  title: string;
  price: number;
  thumbnail: string;
  images: string[];
  quantity: number;
};

export type OrderSummary = {
  id: number;
  order_id: string;
  status: string;
  payment_method: string;
  payment_status: PaymentStatus;
  total: number;
  created_at: string;
};

type OrderSummaryRow = Omit<OrderSummary, "payment_status">;

export type PaymentStatus =
  | "not_required"
  | "pending"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "unknown";

export type OrderItem = {
  id: number;
  product_id: number;
  title: string;
  price: number;
  thumbnail: string;
  quantity: number;
};

export type ShippingAddress = {
  full_name: string;
  phone: string;
  email: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  pincode: string;
};

export type CheckoutAddressInput = {
  fullName: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
};

export type CheckoutOrderInput = {
  items: CartItem[];
  address: CheckoutAddressInput;
  paymentMethod: "cod" | "card" | "upi";
  total: number;
  orderId?: string;
  orderDate?: string;
};

export type InvokeEmailLambdaType = "confirmation" | "payment_failed" | "cancellation";

export type InvokeEmailLambdaPayload = {
  items: Array<{ title: string; quantity: number; price: number }>;
  total: number;
  currency?: string;
  paymentMethod?: string;
  orderDate?: string;
  expectedDeliveryDate?: string;
  address?: {
    fullName?: string;
    phone?: string;
    email?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
};

const paymentStatusCache = new Map<string, PaymentStatus>();

export function clearPaymentStatusCache(): void {
  paymentStatusCache.clear();
}

export async function fetchProducts(): Promise<Product[]> {
  const data = await hasuraRequest<{ products: ProductRow[] }>(
    `
      query GetProducts {
        products(order_by: { id: asc }) {
          id
          title
          description
          price
          category
          thumbnail
          images
          rating
          stock
        }
      }
    `
  );

  return data.products.map(normalizeProduct);
}

export async function fetchProductById(id: number): Promise<Product | null> {
  const data = await hasuraRequest<{ products_by_pk: ProductRow | null }>(
    `
      query GetProductById($id: Int!) {
        products_by_pk(id: $id) {
          id
          title
          description
          price
          category
          thumbnail
          images
          rating
          stock
        }
      }
    `,
    { id }
  );

  return data.products_by_pk ? normalizeProduct(data.products_by_pk) : null;
}

export async function fetchCart(): Promise<CartItem[]> {
  const data = await hasuraRequest<{ cart_items: CartItemRow[] }>(
    `
      query GetCart {
        cart_items(order_by: { created_at: asc }) {
          id
          product_id
          title
          price
          thumbnail
          images
          quantity
        }
      }
    `
  );

  return data.cart_items.map((item) => ({
    id: item.product_id,
    title: item.title,
    price: Number(item.price),
    thumbnail: item.thumbnail,
    images: item.images ?? [],
    quantity: Number(item.quantity),
  }));
}

export async function syncCart(items: CartItem[]): Promise<void> {
  await hasuraRequest(
    `
      mutation ClearCart {
        delete_cart_items(where: {}) {
          affected_rows
        }
      }
    `
  );

  if (items.length === 0) return;

  await hasuraRequest(
    `
      mutation InsertCart($objects: [cart_items_insert_input!]!) {
        insert_cart_items(objects: $objects) {
          affected_rows
        }
      }
    `,
    {
      objects: items.map((item) => ({
        product_id: item.id,
        title: item.title,
        price: item.price,
        thumbnail: item.thumbnail,
        images: item.images ?? [],
        quantity: item.quantity,
      })),
    }
  );
}

export async function createOrderViaAction(input: CheckoutOrderInput): Promise<{
  orderId: string;
  orderDate: string;
  status: string;
  orderStatus: string;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  total: number;
}> {
  const data = await hasuraRequest<{
    createOrder: {
      orderId: string;
      orderDate: string;
      status: string;
      orderStatus: string;
      paymentStatus: string;
      paymentMethod: string;
      total: number;
    };
  }>(
    `
      mutation CreateOrder(
        $items: [CreateOrderItemInput!]!
        $address: CreateOrderAddressInput!
        $paymentMethod: String!
        $total: numeric!
        $orderId: String
        $orderDate: String
      ) {
        createOrder(
          items: $items
          address: $address
          paymentMethod: $paymentMethod
          total: $total
          orderId: $orderId
          orderDate: $orderDate
        ) {
          orderId
          orderDate
          status
          orderStatus
          paymentStatus
          paymentMethod
          total
        }
      }
    `,
    {
      items: input.items.map((item) => ({
        productId: item.id,
        title: item.title,
        price: item.price,
        thumbnail: item.thumbnail || item.images?.[0] || "",
        quantity: item.quantity,
      })),
      address: input.address,
      paymentMethod: input.paymentMethod,
      total: input.total,
      orderId: input.orderId,
      orderDate: input.orderDate,
    }
  );

  return {
    ...data.createOrder,
    total: Number(data.createOrder.total),
    paymentStatus: normalizePaymentStatus(data.createOrder.paymentStatus) ?? "pending",
  };
}

export async function createStripePaymentIntentViaAction(input: {
  orderId: string;
  amount: number;
  currency?: string;
}): Promise<{ clientSecret: string; paymentIntentId: string; reused: boolean }> {
  const data = await hasuraRequest<{
    createStripePaymentIntent: {
      clientSecret: string;
      paymentIntentId: string;
      reused: boolean;
    };
  }>(
    `
      mutation CreateStripePaymentIntent($orderId: String!, $amount: numeric!, $currency: String) {
        createStripePaymentIntent(orderId: $orderId, amount: $amount, currency: $currency) {
          clientSecret
          paymentIntentId
          reused
        }
      }
    `,
    input
  );

  return data.createStripePaymentIntent;
}

export async function invokeEmailLambdaViaAction(input: {
  type: InvokeEmailLambdaType;
  orderId: string;
  email: string;
  payload: InvokeEmailLambdaPayload;
}): Promise<{ success: boolean; message: string }> {
  const data = await hasuraRequest<{
    invokeEmailLambda: {
      success: boolean;
      message: string;
    };
  }>(
    `
      mutation InvokeEmailLambda(
        $type: String!
        $orderId: String!
        $email: String!
        $payload: jsonb!
      ) {
        invokeEmailLambda(type: $type, orderId: $orderId, email: $email, payload: $payload) {
          success
          message
        }
      }
    `,
    input
  );

  return data.invokeEmailLambda;
}

export async function fetchOrderHistory(): Promise<OrderSummary[]> {
  const data = await hasuraRequest<{ orders: OrderSummaryRow[] }>(
    `
      query GetOrderHistory {
        orders(order_by: { created_at: desc }) {
          id
          order_id
          status
          payment_method
          total
          created_at
        }
      }
    `
  );

  return enrichOrders(data.orders);
}

export async function subscribeOrderHistory(
  onData: (orders: OrderSummary[]) => void,
  onError?: (error: Error) => void
): Promise<Unsubscribe> {
  return subscribeHasura<{ orders: OrderSummaryRow[] }>(
    `
      subscription OrderHistoryRealtime {
        orders(order_by: { created_at: desc }) {
          id
          order_id
          status
          payment_method
          total
          created_at
        }
      }
    `,
    undefined,
    (payload) => {
      void enrichOrders(payload.orders)
        .then(onData)
        .catch((error) => {
          onError?.(error instanceof Error ? error : new Error("Failed to enrich payment statuses"));
          onData(payload.orders.map(toOrderSummaryWithFallback));
        });
    },
    onError
  );
}

export async function fetchOrderByExternalId(orderId: string): Promise<{
  order: OrderSummary | null;
  items: OrderItem[];
  address: ShippingAddress | null;
}> {
  const orderData = await hasuraRequest<{ orders: OrderSummaryRow[] }>(
    `
      query GetOrder($orderId: String!) {
        orders(where: { order_id: { _eq: $orderId } }, limit: 1) {
          id
          order_id
          status
          payment_method
          total
          created_at
        }
      }
    `,
    { orderId }
  );

  const rawOrder = orderData.orders[0] ?? null;
  const order = rawOrder ? await enrichOrder(rawOrder) : null;
  if (!order) {
    return { order: null, items: [], address: null };
  }

  const [itemsData, addressData] = await Promise.all([
    hasuraRequest<{ order_items: OrderItem[] }>(
      `
        query GetOrderItems($orderPk: Int!) {
          order_items(where: { order_id: { _eq: $orderPk } }) {
            id
            product_id
            title
            price
            thumbnail
            quantity
          }
        }
      `,
      { orderPk: order.id }
    ),
    hasuraRequest<{ shipping_addresses: ShippingAddress[] }>(
      `
        query GetShippingAddress($orderPk: Int!) {
          shipping_addresses(where: { order_id: { _eq: $orderPk } }, limit: 1) {
            full_name
            phone
            email
            address_line1
            address_line2
            city
            state
            pincode
          }
        }
      `,
      { orderPk: order.id }
    ),
  ]);

  return {
    order,
    items: itemsData.order_items,
    address: addressData.shipping_addresses[0] ?? null,
  };
}

export async function subscribeOrderByExternalId(
  orderId: string,
  onData: (value: {
    order: OrderSummary | null;
    items: OrderItem[];
    address: ShippingAddress | null;
  }) => void,
  onError?: (error: Error) => void
): Promise<Unsubscribe> {
  return subscribeHasura<{
    orders: Array<
      OrderSummaryRow & {
        order_items: OrderItem[];
        shipping_address: ShippingAddress[];
      }
    >;
  }>(
    `
      subscription OrderDetailRealtime($orderId: String!) {
        orders(where: { order_id: { _eq: $orderId } }, limit: 1) {
          id
          order_id
          status
          payment_method
          total
          created_at
          order_items {
            id
            product_id
            title
            price
            thumbnail
            quantity
          }
          shipping_address: shipping_addresses {
            full_name
            phone
            email
            address_line1
            address_line2
            city
            state
            pincode
          }
        }
      }
    `,
    { orderId },
    (payload) => {
      const row = payload.orders[0];
      if (!row) {
        onData({ order: null, items: [], address: null });
        return;
      }

      const firstAddress = row.shipping_address[0] ?? null;

      const { order_items, shipping_address, ...orderRow } = row;
      void enrichOrder(orderRow)
        .then((order) => {
          onData({
            order,
            items: order_items ?? [],
            address: firstAddress,
          });
        })
        .catch((error) => {
          onError?.(error instanceof Error ? error : new Error("Failed to enrich payment status"));
          onData({
            order: toOrderSummaryWithFallback(orderRow),
            items: order_items ?? [],
            address: firstAddress,
          });
        });
    },
    onError
  );
}

export async function fetchOrderConfirmationByExternalId(orderId: string): Promise<{
  orderId: string;
  orderStatus: string;
  paymentStatus: PaymentStatus;
} | null> {
  const data = await hasuraRequest<{
    orders: Array<{
      order_id: string;
      status: string;
      payment_method: string;
      total: number;
      created_at: string;
      id: number;
    }>;
  }>(
    `
      query GetOrderConfirmation($orderId: String!) {
        orders(where: { order_id: { _eq: $orderId } }, limit: 1) {
          id
          order_id
          status
          payment_method
          total
          created_at
        }
      }
    `,
    { orderId }
  );

  const row = data.orders[0];
  if (!row) return null;

  const paymentStatus = await getPaymentStatus({
    id: row.id,
    order_id: row.order_id,
    status: row.status,
    payment_method: row.payment_method,
    total: Number(row.total),
    created_at: row.created_at,
  });

  return {
    orderId: row.order_id,
    orderStatus: row.status,
    paymentStatus,
  };
}

function normalizeProduct(product: ProductRow): Product {
  return {
    ...product,
    price: Number(product.price),
    rating: Number(product.rating),
    stock: Number(product.stock),
  };
}

async function enrichOrder(order: OrderSummaryRow): Promise<OrderSummary> {
  const paymentStatus = await getPaymentStatus(order);
  return {
    ...order,
    payment_status: paymentStatus,
  };
}

async function enrichOrders(orders: OrderSummaryRow[]): Promise<OrderSummary[]> {
  return Promise.all(orders.map(enrichOrder));
}

function toOrderSummaryWithFallback(order: OrderSummaryRow): OrderSummary {
  return {
    ...order,
    payment_status: getFallbackPaymentStatus(order),
  };
}

async function getPaymentStatus(order: OrderSummaryRow): Promise<PaymentStatus> {
  const fallback = getFallbackPaymentStatus(order);
  const paymentMethod = order.payment_method.trim().toLowerCase();

  if (paymentMethod === "cod") {
    return "not_required";
  }

  // Avoid extra API calls when order state already implies a terminal payment state.
  if (fallback !== "pending") {
    return fallback;
  }

  const cached = paymentStatusCache.get(order.order_id);
  if (cached) {
    return cached;
  }

  try {
    const data = await getPaymentStatusAction(order.order_id);
    const normalized = normalizePaymentStatus(data.status) ?? fallback;
    paymentStatusCache.set(order.order_id, normalized);
    return normalized;
  } catch (err) {
    console.error("getPaymentStatus error:", err);
    return fallback;
  }
}

async function getPaymentStatusAction(orderId: string): Promise<{ status: string; amount: number; currency: string; provider: string }> {
  const data = await hasuraRequest<{ getPaymentStatus: { status: string; amount: number; currency: string; provider: string } }>(
    `
      mutation GetPaymentStatus($orderId: String!) {
        getPaymentStatus(orderId: $orderId) {
          status
          amount
          currency
          provider
        }
      }
    `,
    { orderId }
  );

  return data.getPaymentStatus;
}

function getFallbackPaymentStatus(order: OrderSummaryRow): PaymentStatus {
  const paymentMethod = order.payment_method.trim().toLowerCase();
  const orderStatus = order.status.trim().toLowerCase();

  if (paymentMethod === "cod") return "not_required";
  if (orderStatus === "cancelled") return "cancelled";
  if (orderStatus === "confirmed" || orderStatus === "processing" || orderStatus === "shipped" || orderStatus === "delivered") {
    return "succeeded";
  }
  return "pending";
}

function normalizePaymentStatus(status?: string): PaymentStatus | null {
  if (!status) return null;
  const normalized = status.trim().toLowerCase();
  if (normalized === "pending") return "pending";
  if (normalized === "succeeded") return "succeeded";
  if (normalized === "failed") return "failed";
  if (normalized === "cancelled") return "cancelled";
  return "unknown";
}

