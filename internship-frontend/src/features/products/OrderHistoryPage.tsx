import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";

export default function OrderHistoryPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const jwt = localStorage.getItem("jwt");
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
        
        const res = await fetch(`${API_URL}/orders`, {
          headers: { "Authorization": `Bearer ${jwt}` },
        });
        
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders);
        }
      } catch (err) {
        console.error("Failed to fetch orders:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-white">Loading orders...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-6">Order History</h1>
        
        {orders.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/50 rounded-2xl border border-slate-700">
            <svg
              className="w-16 h-16 text-gray-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
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
            {orders.map((order: any) => (
              <div
                key={order.order_id}
                onClick={() => navigate(`/orders/${order.order_id}`)}
                className="bg-slate-800/50 backdrop-blur-lg rounded-2xl p-6 border border-slate-700 cursor-pointer hover:bg-slate-700/50 transition"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-gray-400 text-sm">Order ID</p>
                    <p className="text-white font-mono font-semibold">
                      {order.order_id}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-sm mb-1">Status</p>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                        order.status === "confirmed"
                          ? "bg-green-600/20 text-green-400"
                          : order.status === "pending"
                          ? "bg-yellow-600/20 text-yellow-400"
                          : order.status === "processing"
                          ? "bg-blue-600/20 text-blue-400"
                          : order.status === "shipped"
                          ? "bg-indigo-600/20 text-indigo-400"
                          : order.status === "delivered"
                          ? "bg-green-600/20 text-green-400"
                          : "bg-gray-600/20 text-gray-400"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
                
                <div className="border-t border-slate-700 pt-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-gray-400 text-sm mb-1">
                        {order.items?.length || 0} item{order.items?.length !== 1 ? "s" : ""}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {new Date(order.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-blue-400 font-bold text-xl">
                        ₹{Number(order.total).toFixed(2)}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {order.payment_method === "cod"
                          ? "Cash on Delivery"
                          : order.payment_method === "card"
                          ? "Card Payment"
                          : "UPI Payment"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}