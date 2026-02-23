import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import {
  fetchOrderByExternalId,
  subscribeOrderByExternalId,
  type OrderSummary,
  type OrderItem,
  type ShippingAddress,
} from "./hasuraCommerce";

type OrderDetailState = {
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

  // Simple delivery estimate by status.
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
  const [detail, setDetail] = useState<OrderDetailState>({
    order: null,
    items: [],
    address: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | undefined;

    const load = async () => {
      if (!orderId) {
        navigate("/orders");
        return;
      }

      try {
        const data = await fetchOrderByExternalId(orderId);
        if (!data.order) {
          navigate("/orders");
          return;
        }
        if (!mounted) return;
        setDetail(data);
      } catch (err) {
        console.error("Failed to fetch order:", err);
        if (mounted) setError("Failed to load order details.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    if (orderId) {
      subscribeOrderByExternalId(
        orderId,
        (next) => {
          if (!mounted) return;
          if (!next.order) {
            navigate("/orders");
            return;
          }
          setDetail(next);
        },
        (err) => console.error("Order detail realtime subscription failed:", err)
      )
        .then((stop) => {
          unsubscribe = stop;
        })
        .catch((err) => {
          console.error("Order detail realtime setup failed:", err);
          if (mounted) setError("Realtime updates unavailable.");
        });
    }

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [orderId, navigate]);

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto p-6 text-white">Loading order...</div>
      </AppLayout>
    );
  }

  if (!detail.order) return null;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <button
          type="button"
          onClick={() => navigate("/orders")}
          className="text-blue-400 mb-6 hover:underline"
        >
          Back to Orders
        </button>

        {error && (
          <div className="mb-5 rounded-lg border border-red-500/40 bg-red-600/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="bg-slate-800 rounded-lg p-6">
          <div className="border-b border-slate-700 pb-4 mb-4">
            <h1 className="text-2xl font-bold text-white mb-2">Order Details</h1>
            <p className="text-gray-400">Order ID: {detail.order.order_id}</p>
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
                <div key={item.id} className="flex gap-4 bg-slate-700/50 rounded-lg p-3">
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-16 h-16 object-contain bg-white rounded"
                  />
                  <div className="flex-1">
                    <p className="text-white text-sm">{item.title}</p>
                    <p className="text-gray-400 text-xs">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-blue-400 font-semibold">{formatMoney(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-700 pt-4">
            <div className="flex justify-between text-xl font-bold text-white">
              <span>Total</span>
              <span className="text-blue-400">{formatMoney(detail.order.total)}</span>
            </div>
            {shouldShowExpectedDelivery(detail.order.status) && (
              <div className="mt-3 flex justify-between text-sm text-slate-300">
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
