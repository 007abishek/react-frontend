import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import {
  fetchOrderHistory,
  subscribeOrderHistory,
  type OrderSummary,
} from "./hasuraCommerce";

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

function getPaymentLabel(method: string): string {
  if (method === "cod") return "Cash on Delivery";
  if (method === "card") return "Card Payment";
  if (method === "upi") return "UPI Payment";
  return method;
}

function isPendingStatus(status: string): boolean {
  return status.trim().toLowerCase() === "pending";
}

function humanizeStatus(status: string): string {
  return status
    .trim()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export default function OrderHistoryPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 5;
  const visibleOrders = orders.filter((order) => !isPendingStatus(order.status));
  const totalPages = Math.max(1, Math.ceil(visibleOrders.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const pagedOrders = visibleOrders.slice(start, start + PAGE_SIZE);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | undefined;

    const load = async () => {
      try {
        const data = await fetchOrderHistory();
        if (mounted) setOrders(data);
      } catch (err) {
        console.error("Failed to fetch orders:", err);
        if (mounted) setError("Failed to load order history.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    subscribeOrderHistory(
      (nextOrders) => {
        if (!mounted) return;
        setOrders(nextOrders);
        const nextVisible = nextOrders.filter((order) => !isPendingStatus(order.status));
        setPage((prev) => Math.min(prev, Math.max(1, Math.ceil(nextVisible.length / PAGE_SIZE))));
      },
      (err) => console.error("Order realtime subscription failed:", err)
    )
      .then((stop) => {
        unsubscribe = stop;
      })
      .catch((err) => {
        console.error("Order realtime setup failed:", err);
      });

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
            <p className="text-white">Loading orders...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h1 className="text-3xl font-bold text-white">Order History</h1>
          <button
            type="button"
            onClick={() => navigate("/products")}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 transition"
          >
            Back to Products
          </button>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-red-500/40 bg-red-600/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {visibleOrders.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/50 rounded-2xl border border-slate-700">
            <p className="text-gray-400 mb-4">No orders yet</p>
            <button
              onClick={() => navigate("/products")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {pagedOrders.map((order) => (
              <div
                key={order.order_id}
                onClick={() => navigate(`/orders/${order.order_id}`)}
                className="bg-slate-800/50 backdrop-blur-lg rounded-2xl p-6 border border-slate-700 cursor-pointer hover:bg-slate-700/50 transition"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-gray-400 text-sm">Order ID</p>
                    <p className="text-white font-mono font-semibold">{order.order_id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-sm mb-1">Order Status</p>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getOrderStatusStyle(
                        order.status
                      )}`}
                    >
                      {humanizeStatus(order.status)}
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-700 pt-4">
                  <div className="flex justify-between items-center">
                    <p className="text-gray-500 text-xs">
                      {new Date(order.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <div className="text-right">
                      <p className="text-blue-400 font-bold text-xl">
                        Rs {Number(order.total).toFixed(2)}
                      </p>
                      <p className="text-gray-400 text-sm">{getPaymentLabel(order.payment_method)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="mt-6 flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900/40 px-4 py-3">
              <p className="text-sm text-slate-400">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-md border border-slate-600 px-3 py-1.5 text-sm text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-md border border-slate-600 px-3 py-1.5 text-sm text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
