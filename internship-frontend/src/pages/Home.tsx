import AppLayout from "../components/layout/AppLayout";
import FeatureCard from "../components/FeatureCard";

export default function Home() {
  return (
    <AppLayout>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* 🔴 TEMP SENTRY TEST BUTTON */}
      <button
        className="mb-6 rounded bg-red-500 px-4 py-2 text-white"
        onClick={() => {
          throw new Error("Sentry test error 🚨");
        }}
      >
        Test Sentry
      </button>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <FeatureCard
          title="Todos"
          description="Manage daily tasks"
          route="/todos"
        />

        <FeatureCard
          title="Products"
          description="Browse & cart"
          route="/products"
        />

        <FeatureCard
          title="GitHub"
          description="Search repositories"
          route="/github"
        />
      </div>
    </AppLayout>
  );
}
