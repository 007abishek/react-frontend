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
        rounded-xl sm:rounded-2xl
        p-4 sm:p-6
        bg-white/70 dark:bg-slate-800/70
        backdrop-blur-md
        border border-slate-200/60 dark:border-slate-700/60
        shadow-sm
        transition
        hover:shadow-md
        hover:border-blue-400/40
        active:scale-[0.98]
      "
    >
      {/* Icon */}
      <div
        className="
          mb-3 sm:mb-4
          flex
          h-10 w-10 sm:h-12 sm:w-12
          items-center justify-center
          rounded-lg sm:rounded-xl
          bg-blue-500/10 dark:bg-blue-400/20
          text-xl sm:text-2xl
        "
      >
        {icon}
      </div>

      {/* Title */}
      <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white mb-1">
        {title}
      </h2>

      {/* Description */}
      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        {description}
      </p>
    </div>
  );
}