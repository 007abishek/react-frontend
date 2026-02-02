import AppLayout from "../components/layout/AppLayout";
import FeatureCard from "../components/FeatureCard";

export default function Home() {
  return (
    <AppLayout>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
