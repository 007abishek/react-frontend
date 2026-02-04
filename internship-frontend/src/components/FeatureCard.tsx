import { useNavigate } from "react-router-dom";

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  route: string;
}

export default function FeatureCard({
  icon,
  title,
  description,
  route,
}: FeatureCardProps) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(route)}
      className="
        cursor-pointer
        rounded-2xl p-6
        bg-white/70 dark:bg-slate-800/70
        backdrop-blur-md
        border border-slate-200/60 dark:border-slate-700/60
        shadow-sm
        transition
        hover:shadow-md
        hover:border-blue-400/40
      "
    >
      {/* Icon */}
      <div
        className="
          mb-4 flex h-12 w-12 items-center justify-center
          rounded-xl
          bg-blue-500/10 dark:bg-blue-400/20
          text-2xl
        "
      >
        {icon}
      </div>

      {/* Title */}
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
        {title}
      </h2>

      {/* Description */}
      <p className="text-sm text-slate-600 dark:text-slate-300">
        {description}
      </p>
    </div>
  );
}
