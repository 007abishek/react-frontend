import { hasuraRequest, subscribeHasura, type Unsubscribe } from "../../../utils/hasuraClient";
import { getFallbackPaymentStatus, getPaymentStatus, normalizePaymentStatus } from "./payments";
import type {
  CheckoutOrderInput,
  OrderItem,
  OrderSummary,
  OrderSummaryRow,
  PaymentStatus,
  ShippingAddress,
} from "./types";

const ORDER_SUMMARY_FIELDS = `
  id
  order_id
  status
  payment_method
  total
  created_at
`;

const ORDER_ITEM_FIELDS = `
  id
  product_id
  title
  price
  thumbnail
  quantity
`;

const SHIPPING_ADDRESS_FIELDS = `
  full_name
  phone
  email
  address_line1
  address_line2
  city
  state
  pincode
`;

type OrderDetailRow = OrderSummaryRow & {
  order_items: OrderItem[];
  shipping_address: ShippingAddress[];
};

type OrderDetailResult = {
  order: OrderSummary | null;
  items: OrderItem[];
  address: ShippingAddress | null;
};

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
      items: input.items.map((item) => ({
        productId: item.id,
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

export async function subscribeOrderHistory(
  onData: (orders: OrderSummary[]) => void,
  onError?: (error: Error) => void
): Promise<Unsubscribe> {
  return subscribeHasura<{ orders: OrderSummaryRow[] }>(
    `
      subscription OrderHistoryRealtime {
        orders(order_by: { created_at: desc }) {
          ${ORDER_SUMMARY_FIELDS}
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

export async function fetchOrderByExternalId(orderId: string): Promise<OrderDetailResult> {
  const data = await hasuraRequest<{ orders: OrderDetailRow[] }>(
    `
      query GetOrder($orderId: String!) {
        orders(where: { order_id: { _eq: $orderId } }, limit: 1) {
          ${ORDER_SUMMARY_FIELDS}
          order_items {
            ${ORDER_ITEM_FIELDS}
          }
          shipping_address: shipping_addresses(limit: 1) {
            ${SHIPPING_ADDRESS_FIELDS}
          }
        }
      }
    `,
    { orderId }
  );

  const row = data.orders[0] ?? null;
  if (!row) {
    return { order: null, items: [], address: null };
  }

  return {
    order: await enrichOrder(row),
    items: row.order_items,
    address: row.shipping_address[0] ?? null,
  };
}

export async function subscribeOrderByExternalId(
  orderId: string,
  onData: (value: OrderDetailResult) => void,
  onError?: (error: Error) => void
): Promise<Unsubscribe> {
  return subscribeHasura<{ orders: OrderDetailRow[] }>(
    `
      subscription OrderDetailRealtime($orderId: String!) {
        orders(where: { order_id: { _eq: $orderId } }, limit: 1) {
          ${ORDER_SUMMARY_FIELDS}
          order_items {
            ${ORDER_ITEM_FIELDS}
          }
          shipping_address: shipping_addresses(limit: 1) {
            ${SHIPPING_ADDRESS_FIELDS}
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

      const { order_items, shipping_address, ...orderRow } = row;
      void enrichOrder(orderRow)
        .then((order) => {
          onData({
            order,
            items: order_items,
            address: shipping_address[0] ?? null,
          });
        })
        .catch((error) => {
          onError?.(error instanceof Error ? error : new Error("Failed to enrich payment status"));
          onData({
            order: toOrderSummaryWithFallback(orderRow),
            items: order_items,
            address: shipping_address[0] ?? null,
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
    orders: OrderSummaryRow[];
  }>(
    `
      query GetOrderConfirmation($orderId: String!) {
        orders(where: { order_id: { _eq: $orderId } }, limit: 1) {
          ${ORDER_SUMMARY_FIELDS}
        }
      }
    `,
    { orderId }
  );

  const row = data.orders[0];
  if (!row) return null;

  const paymentStatus = await getPaymentStatus(row);

  return {
    orderId: row.order_id,
    orderStatus: row.status,
    paymentStatus,
  };
}
