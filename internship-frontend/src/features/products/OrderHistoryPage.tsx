import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import { subscribeOrderHistory, type OrderSummary } from "./hasuraCommerce";
import { useHasuraSubscription } from "../../hooks/useHasuraSubscription";

const ORDER_STATUS_STYLES: Record<string, string> = {
  confirmed:
    "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/30",
  pending:
    "bg-amber-50 text-amber-800 ring-1 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/30",
  processing:
    "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-400/30",
  shipped:
    "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/20 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-400/30",
  delivered:
    "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/30",
  cancelled:
    "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/30",
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
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600 dark:border-blue-400" />
            <p className="text-sm text-slate-600 dark:text-slate-300">Loading orders...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-red-600 dark:text-red-400">Error loading orders: {error}</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
            Order History
          </h1>
          {status === "live" && (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/30">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Live
            </span>
          )}
        </div>

        {orders.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 md:p-6 dark:border-zinc-700 dark:bg-zinc-900">
            <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">No orders yet</p>
            <button
              type="button"
              onClick={() => navigate("/products")}
              className="w-full rounded-lg bg-blue-600 px-6 py-3 text-white transition hover:bg-blue-700 sm:w-auto"
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
                className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 transition hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800/60 sm:p-6"
              >
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Order ID</p>
                    <p className="break-all font-mono text-sm font-semibold text-slate-900 dark:text-white sm:text-base">
                      {order.order_id}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="mb-1 text-sm text-slate-500 dark:text-slate-400">Status</p>
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${getOrderStatusStyle(
                        order.status
                      )}`}
                    >
                      {humanizeStatus(order.status)}
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4 dark:border-zinc-700">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(order.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400 sm:text-xl">
                        Rs {Number(order.total).toFixed(2)}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        {getPaymentLabel(order.payment_method)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {totalPages > 1 && (
              <div className="mt-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Page {page} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:text-slate-100 dark:hover:bg-zinc-800 sm:px-3 sm:py-1.5"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:text-slate-100 dark:hover:bg-zinc-800 sm:px-3 sm:py-1.5"
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
