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

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

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

function normalizeProduct(product: ProductRow): Product {
  return {
    ...product,
    price: Number(product.price),
    rating: Number(product.rating),
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

  const jwt = localStorage.getItem("jwt");
  if (!jwt) {
    return fallback;
  }

  try {
    const res = await fetch(`${API_URL}/payments/${encodeURIComponent(order.order_id)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    });

    if (!res.ok) {
      return fallback;
    }

    const body = (await res.json()) as { payment?: { status?: string } };
    return normalizePaymentStatus(body.payment?.status) ?? fallback;
  } catch {
    return fallback;
  }
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
