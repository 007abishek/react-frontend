import AppLayout from "../components/layout/AppLayout";
import FeatureCard from "../components/FeatureCard";

export default function Home() {
  return (
    <AppLayout>
      <div className="mb-6 sm:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight ">Dashboard</h1>
          <p className="mt-1 text-sm sm:text-base text-slate-500">Quick access to your features</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4  sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <FeatureCard
          icon="📋"
          title="Todos"
          description="Manage daily tasks"
          route="/todos"
        />

        <FeatureCard
          icon="🛒"
          title="Products"
          description="Browse and cart"
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
