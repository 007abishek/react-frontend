import AppLayout from "../components/layout/AppLayout";
import FeatureCard from "../components/FeatureCard";

export default function Home() {
  return (
    <AppLayout>
      {/* ===== Dashboard Header ===== */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Dashboard
          </h1>
          <p className="mt-1 text-slate-500">
            Quick access to your features
          </p>
        </div>

        {/* TEMP SENTRY TEST BUTTON */}
        <button
          className="
            rounded-md
            bg-red-500
            px-4 py-2
            text-sm font-medium
            text-white
            transition
            hover:bg-red-600
          "
          onClick={() => {
            throw new Error("Sentry test error 🚨");
          }}
        >
          Test Sentry
        </button>
      </div>

      {/* ===== Feature Cards ===== */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <FeatureCard
          icon="📝"
          title="Todos"
          description="Manage daily tasks"
          route="/todos"
        />

        <FeatureCard
          icon="🛒"
          title="Products"
          description="Browse & cart"
          route="/products"
        />

        <FeatureCard
          icon="🔍"
          title="GitHub"
          description="Search repositories"
          route="/github"
        />
      </div>
    </AppLayout>
  );
}
