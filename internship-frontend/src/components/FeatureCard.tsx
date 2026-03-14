import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

type FeatureTone = "teal" | "purple" | "cyan";

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  route: string;
  tone?: FeatureTone;
  metric?: string;
  status?: string;
}

const toneMap: Record<FeatureTone, string> = {
  teal: "bg-teal-100 text-teal-600 dark:bg-teal-400/20 dark:text-teal-300",
  purple: "bg-violet-100 text-violet-600 dark:bg-violet-400/20 dark:text-violet-300",
  cyan: "bg-cyan-100 text-cyan-600 dark:bg-cyan-400/20 dark:text-cyan-300",
};

export default function FeatureCard({
  icon,
  title,
  description,
  route,
  tone = "teal",
  metric,
  status,
}: FeatureCardProps) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(route)}
      aria-label={`Open ${title}`}
      className="group w-full rounded-2xl border border-[color:var(--border-subtle)] bg-[var(--bg-surface)] p-6 text-left shadow-[0_8px_26px_-22px_rgba(2,6,23,0.65)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_35px_-26px_rgba(76,29,149,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
    >
      <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl text-xl ${toneMap[tone]}`}>
        {icon}
      </div>

      <h2 className="mb-1.5 text-2xl font-semibold leading-tight text-[var(--text-primary)]">{title}</h2>
      <p className="text-base leading-relaxed text-[var(--text-secondary)]">{description}</p>

      {(metric || status) && (
        <div className="mt-5 flex items-center justify-between border-t border-[color:var(--border-subtle)] pt-4">
          <span className="text-sm font-medium text-[var(--text-secondary)]">{status ?? "Live"}</span>
          <span className="text-sm font-semibold text-[var(--text-primary)]">{metric}</span>
        </div>
      )}
    </button>
  );
}
