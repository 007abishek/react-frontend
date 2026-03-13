import { useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import {
  subscribeOrderByExternalId,
  type OrderSummary,
  type OrderItem,
  type ShippingAddress,
} from "./hasuraCommerce";
import { useHasuraSubscription } from "../../hooks/useHasuraSubscription";
import { orderIdParamSchema } from "./schemas/routeSchemas";

type OrderDetailPayload = {
  order: OrderSummary | null;
  items: OrderItem[];
  address: ShippingAddress | null;
};

function formatMoney(value: number): string {
  return `Rs ${Number(value).toFixed(2)}`;
}

const ORDER_STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-green-600/20 text-green-400",
  pending: "bg-yellow-600/20 text-yellow-400",
  processing: "bg-blue-600/20 text-blue-400",
  shipped: "bg-indigo-600/20 text-indigo-400",
  delivered: "bg-green-600/20 text-green-400",
  cancelled: "bg-red-600/20 text-red-400",
};

function getOrderStatusStyle(status: string): string {
  return ORDER_STATUS_STYLES[status.trim().toLowerCase()] ?? "bg-gray-600/20 text-gray-400";
}

function humanizeStatus(status: string): string {
  return status
    .trim()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function getExpectedDeliveryDate(order: OrderSummary): string {
  const created = new Date(order.created_at);
  if (Number.isNaN(created.getTime())) return "TBD";

  let daysToAdd = 5;
  if (order.status === "pending") daysToAdd = 6;
  if (order.status === "confirmed") daysToAdd = 5;
  if (order.status === "processing") daysToAdd = 4;
  if (order.status === "shipped") daysToAdd = 2;
  if (order.status === "delivered") daysToAdd = 0;

  const expected = new Date(created);
  expected.setDate(expected.getDate() + daysToAdd);

  return expected.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function shouldShowExpectedDelivery(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  return (
    normalized === "confirmed" ||
    normalized === "processing" ||
    normalized === "shipped" ||
    normalized === "delivered"
  );
}

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const parsedOrderId = orderIdParamSchema.safeParse(orderId);
  const validOrderId = parsedOrderId.success ? parsedOrderId.data : null;

  const subscribe = useCallback(
    (
      onData: (payload: OrderDetailPayload) => void,
      onError: (err: Error) => void
    ) => {
      if (!validOrderId) return Promise.reject(new Error("No order ID"));
      return subscribeOrderByExternalId(validOrderId, onData, onError);
    },
    [validOrderId]
  );

  const { data: detail, loading, error, status } = useHasuraSubscription<OrderDetailPayload>(subscribe);

  if (!parsedOrderId.success) {
    return (
      <AppLayout>
        <div  className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <p className="mb-4 text-sm text-red-300">Invalid order id.</p>
          <button
            type="button"
            onClick={() => navigate("/orders")}
            className="text-blue-400 hover:underline"
          >
            Back to Orders
          </button>
        </div>
      </AppLayout>
    );
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto p-6 text-white">Loading order...</div>
      </AppLayout>
    );
  }

  if (!detail?.order) {
    if (!loading) navigate("/orders");
    return null;
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <button
          type="button"
          onClick={() => navigate("/orders")}
          className="text-blue-400 mb-6 hover:underline text-sm sm:text-base"
        >
          Back to Orders
        </button>

        {error && (
          <div className="mb-5 rounded-lg border border-red-500/40 bg-red-600/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="rounded-lg bg-slate-800 p-4 sm:p-6">
          <div className="border-b border-slate-700 pb-4 mb-4">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-xl font-bold text-white sm:text-2xl">Order Details</h1>
              {status === "live" && (
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-600/20 px-3 py-1 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/30">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  Live
                </span>
              )}
            </div>
            <p className="break-all text-gray-400 text-xs sm:text-sm">Order ID: {detail.order.order_id}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400">Order</span>
              <span
                className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${getOrderStatusStyle(
                  detail.order.status
                )}`}
              >
                {humanizeStatus(detail.order.status)}
              </span>
            </div>
          </div>

          {detail.address && (
            <div className="mb-6">
              <h3 className="text-white font-semibold mb-2">Shipping Address</h3>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-white">{detail.address.full_name}</p>
                <p className="text-gray-300 text-sm">
                  {detail.address.address_line1}
                  {detail.address.address_line2 ? `, ${detail.address.address_line2}` : ""}
                </p>
                <p className="text-gray-300 text-sm">
                  {detail.address.city}, {detail.address.state} - {detail.address.pincode}
                </p>
              </div>
            </div>
          )}

          <div className="mb-6">
            <h3 className="text-white font-semibold mb-2">Order Items</h3>
            <div className="space-y-3">
              {detail.items.map((item) => (
                <div key={item.id} className="flex flex-col gap-3 rounded-lg bg-slate-700/50 p-3  sm:p-4 sm:flex-row sm:items-start sm:gap-4">
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                  className="w-14 h-14 sm:w-16 sm:h-16 object-contain bg-white rounded"
                  />
                  <div className="flex-1">
                    <p className="text-white text-sm">{item.title}</p>
                    <p className="text-gray-400 text-xs">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-semibold text-blue-400 sm:text-right">{formatMoney(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-700 pt-4">
            <div className="flex items-start justify-between gap-3 text-lg font-bold text-white sm:text-xl">
              <span>Total</span>
              <span className="text-right text-blue-400">{formatMoney(detail.order.total)}</span>
            </div>
            {shouldShowExpectedDelivery(detail.order.status) && (
              <div className="mt-3 flex flex-col gap-1 text-sm text-slate-300 sm:flex-row sm:justify-between">
                <span>Expected Delivery</span>
                <span className="text-emerald-300">
                  {detail.order.status === "delivered"
                    ? "Delivered"
                    : getExpectedDeliveryDate(detail.order)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
