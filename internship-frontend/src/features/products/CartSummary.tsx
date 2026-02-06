import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../../app/hooks";
import { selectCartTotal } from "./cartSelectors";

interface CartSummaryProps {
  showCheckoutButton?: boolean;
}

export default function CartSummary({
  showCheckoutButton = false,
}: CartSummaryProps) {
  const navigate = useNavigate();

  // ✅ SAFE total
  const totalAmount = useAppSelector(selectCartTotal);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-8 rounded-2xl shadow-sm">
      <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">
        Summary
      </h2>

      <div className="space-y-4 mb-6">
        <div className="flex justify-between text-slate-500">
          <span>Subtotal</span>
          <span className="font-semibold text-slate-900 dark:text-white">
            ₹ {totalAmount.toLocaleString()}
          </span>
        </div>

        <div className="flex justify-between text-slate-500">
          <span>Shipping</span>
          <span className="text-green-600 font-bold uppercase text-sm">
            Free
          </span>
        </div>

        <div className="border-t border-slate-100 dark:border-zinc-800 pt-4 flex justify-between items-center">
          <span className="text-lg font-bold">Total</span>
          <span className="text-3xl font-black text-blue-600 dark:text-blue-400">
            ₹ {totalAmount.toLocaleString()}
          </span>
        </div>
      </div>

      {showCheckoutButton && (
        <button
          onClick={() => navigate("/checkout")}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-1 active:scale-[0.98]"
        >
          Proceed to Checkout
        </button>
      )}
    </div>
  );
}
