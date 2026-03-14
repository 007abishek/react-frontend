import AppLayout from "../components/layout/AppLayout";
import FeatureCard from "../components/FeatureCard";

function TodoIcon() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5h6M9 9h6M5 5h.01M5 9h.01M5 13h.01M9 13h6M9 17h6" />
    </svg>
  );
}

function ProductIcon() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-2 3h12m-8 4a1 1 0 100 2 1 1 0 000-2zm7 0a1 1 0 100 2 1 1 0 000-2z" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.9a3.35 3.35 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.35 3.35 0 009 18.1V22" />
    </svg>
  );
}

export default function Home() {
  return (
    <AppLayout>
      <div className="mb-6 sm:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Dashboard</h1>
          <p className="mt-1 text-sm sm:text-base text-[var(--text-secondary)]">Quick access to your features</p>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-label="Core modules">
        <FeatureCard
          icon={<TodoIcon />}
          title="Todos"
          description="Plan team tasks and track completion by priority."
          route="/todos"
          tone="purple"
          status="Focus today"
          metric="12 open"
        />

        <FeatureCard
          icon={<ProductIcon />}
          title="Products"
          description="Monitor catalog, cart flow, and order funnel health."
          route="/products"
          tone="teal"
          status="Revenue"
          metric="$24.8k"
        />

        <FeatureCard
          icon={<GithubIcon />}
          title="GitHub"
          description="Review repositories, activity, and engineering signals."
          route="/github"
          tone="cyan"
          status="PRs pending"
          metric="7"
        />
      </section>

      <section className="mt-8 grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3" aria-label="Overview stats">
        <article className="rounded-2xl border border-[color:var(--border-subtle)] bg-[var(--bg-surface)] p-5">
          <p className="text-sm text-[var(--text-secondary)]">Active Users</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">2,431</p>
          <p className="mt-2 text-sm text-emerald-500">+8.2% vs last week</p>
        </article>

        <article className="rounded-2xl border border-[color:var(--border-subtle)] bg-[var(--bg-surface)] p-5">
          <p className="text-sm text-[var(--text-secondary)]">Conversion Rate</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">4.6%</p>
          <p className="mt-2 text-sm text-emerald-500">+0.7% from yesterday</p>
        </article>

        <article className="rounded-2xl border border-[color:var(--border-subtle)] bg-[var(--bg-surface)] p-5">
          <p className="text-sm text-[var(--text-secondary)]">System Health</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">99.95%</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">No incidents in last 24h</p>
        </article>
      </section>
    </AppLayout>
  );
}
