// src/features/products/OrderDetailPage.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const jwt = localStorage.getItem("jwt");
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
        
        const res = await fetch(`${API_URL}/orders/${orderId}`, {
          headers: { "Authorization": `Bearer ${jwt}` },
        });
        
        if (res.ok) {
          const data = await res.json();
          setOrder(data.order);
        } else {
          navigate("/orders");
        }
      } catch (err) {
        console.error("Failed to fetch order:", err);
        navigate("/orders");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, navigate]);

  if (loading) {
    return <AppLayout><p className="text-white">Loading order...</p></AppLayout>;
  }

  if (!order) return null;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate("/orders")}
          className="text-blue-400 mb-6 hover:underline"
        >
          ← Back to Orders
        </button>

        <div className="bg-slate-800 rounded-lg p-6">
          <div className="border-b border-slate-700 pb-4 mb-4">
            <h1 className="text-2xl font-bold text-white mb-2">Order Details</h1>
            <p className="text-gray-400">Order ID: {order.order_id}</p>
          </div>

          {/* Address */}
          <div className="mb-6">
            <h3 className="text-white font-semibold mb-2">Shipping Address</h3>
            <div className="bg-slate-700/50 rounded-lg p-4">
              <p className="text-white">{order.address?.fullName}</p>
              <p className="text-gray-300 text-sm">
                {order.address?.addressLine1}, {order.address?.addressLine2}
              </p>
              <p className="text-gray-300 text-sm">
                {order.address?.city}, {order.address?.state} - {order.address?.pincode}
              </p>
            </div>
          </div>

          {/* Items */}
          <div className="mb-6">
            <h3 className="text-white font-semibold mb-2">Order Items</h3>
            <div className="space-y-3">
              {order.items?.map((item: any) => (
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
                  <p className="text-blue-400 font-semibold">₹{item.price * item.quantity}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="border-t border-slate-700 pt-4">
            <div className="flex justify-between text-xl font-bold text-white">
              <span>Total</span>
              <span className="text-blue-400">₹{order.total}</span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}