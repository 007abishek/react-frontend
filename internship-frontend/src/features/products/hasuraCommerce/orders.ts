import { hasuraRequest, subscribeHasura, type Unsubscribe } from "../../../utils/hasuraClient";
import type { CartItem } from "../cartSlice";
import { getFallbackPaymentStatus, getPaymentStatus, normalizePaymentStatus } from "./payments";
import type {
  CheckoutOrderInput,
  OrderItem,
  OrderSummary,
  OrderSummaryRow,
  PaymentStatus,
  ShippingAddress,
} from "./types";

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
      items: input.items.map((item: CartItem) => ({
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
