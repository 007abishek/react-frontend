import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import { subscribeOrderHistory, type OrderSummary } from "./hasuraCommerce";
import { useHasuraSubscription } from "../../hooks/useHasuraSubscription";

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
  const normalized = method.trim().toLowerCase();
  if (normalized === "cod") return "Cash on Delivery";
  if (normalized === "card") return "Card Payment";
  if (normalized === "upi") return "UPI Payment";
  return method;
}

function humanizeStatus(status: string): string {
  return status
    .trim()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

const PAGE_SIZE = 5;

export default function OrderHistoryPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  const subscribe = useCallback(
    (onData: (orders: OrderSummary[]) => void, onError: (err: Error) => void) =>
      subscribeOrderHistory(onData, onError),
    []
  );

  const { data: allOrders, loading, error, status } = useHasuraSubscription<OrderSummary[]>(subscribe);

  const orders = allOrders ?? [];
  const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE));
  const pagedOrders = orders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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

  if (error) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-red-400">Error loading orders: {error}</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl px-2 py-6 sm:px-4 sm:py-8">
        <div className="mb-6 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Order History</h1>
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

        {orders.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/50 rounded-2xl border border-slate-700">
            <p className="text-gray-400 mb-4">No orders yet</p>
            <button
              type="button"
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
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Order ID</p>
                    <p className="break-all font-mono font-semibold text-white">{order.order_id}</p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-gray-400 text-sm mb-1">Status</p>
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
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-gray-500 text-xs">
                        {new Date(order.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-xl font-bold text-blue-400">Rs {Number(order.total).toFixed(2)}</p>
                      <p className="text-gray-400 text-sm">{getPaymentLabel(order.payment_method)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {totalPages > 1 && (
              <div className="mt-6 flex flex-col gap-3 rounded-xl border border-slate-700 bg-slate-900/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
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
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
