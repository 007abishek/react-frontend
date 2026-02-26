import { gql, useQuery } from "@apollo/client";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import { getHasuraToken } from "../../utils/hasuraClient";

type OrderItem = {
  title: string;
  quantity: number;
  price: number;
};

type Order = {
  order_id: string;
  status: string;
  total: number;
  created_at: string;
  payment_method: string;
  items: OrderItem[];
};

type GetUserOrdersData = {
  orders: Order[];
  orders_aggregate: {
    aggregate: {
      count: number;
    } | null;
  };
};

const GET_ORDERS = gql`
  query GetUserOrders($limit: Int!, $offset: Int!, $where: orders_bool_exp!) {
    orders(where: $where, order_by: { created_at: desc }, limit: $limit, offset: $offset) {
      order_id
      status
      total
      created_at
      payment_method
      items: order_items {
        title
        quantity
        price
      }
    }
    orders_aggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`;

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

export default function OrderHistoryPage() {
  const navigate = useNavigate();
  const [tokenReady, setTokenReady] = useState(false);
  const [tokenError, setTokenError] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;
  const where = { status: { _in: ["confirmed", "cancelled"] } };

  useEffect(() => {
    let mounted = true;

    void getHasuraToken()
      .then(() => {
        if (!mounted) return;
        setTokenReady(true);
      })
      .catch((err) => {
        if (!mounted) return;
        setTokenError(err instanceof Error ? err.message : "Failed to initialize Hasura auth");
      });

    return () => {
      mounted = false;
    };
  }, []);

  const { data, loading, error } = useQuery<GetUserOrdersData>(GET_ORDERS, {
    fetchPolicy: "network-only",
    skip: !tokenReady,
    variables: {
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      where,
    },
  });

  if (!tokenReady || loading) {
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

  if (tokenError) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-red-400">Error loading orders: {tokenError}</p>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-red-400">Error loading orders: {error.message}</p>
        </div>
      </AppLayout>
    );
  }

  const orders = data?.orders ?? [];
  const totalCount = data?.orders_aggregate.aggregate?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl px-2 py-6 sm:px-4 sm:py-8">
        <h1 className="mb-6 text-2xl font-bold text-white sm:text-3xl">Order History (GraphQL)</h1>

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
            {orders.map((order) => (
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
                      <p className="text-gray-400 text-sm mb-1">
                        {order.items?.length ?? 0} item{(order.items?.length ?? 0) !== 1 ? "s" : ""}
                      </p>
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
          </div>
        )}
      </div>
    </AppLayout>
  );
}
