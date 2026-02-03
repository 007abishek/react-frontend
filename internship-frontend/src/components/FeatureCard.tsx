import { useNavigate } from "react-router-dom";

interface FeatureCardProps {
  icon: string;          // NEW
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
        group
        cursor-pointer
        p-6 rounded-2xl
        bg-gradient-to-br
        from-indigo-500/10 via-sky-500/10 to-purple-500/10
        dark:from-indigo-500/20 dark:via-sky-500/20 dark:to-purple-500/20
        border border-white/10
        shadow-sm
        hover:shadow-xl
        hover:-translate-y-1
        transition-all duration-300
      "
    >
      {/* ===== Icon ===== */}
      <div
        className="
          mb-4
          flex h-12 w-12 items-center justify-center
          rounded-xl
          bg-indigo-500/15
          text-2xl
          transition
          group-hover:scale-110
        "
      >
        {icon}
      </div>

      {/* ===== Title ===== */}
      <h2
        className="
          text-lg font-semibold
          text-gray-900 dark:text-white
          mb-1
          group-hover:text-indigo-500
          transition-colors
        "
      >
        {title}
      </h2>

      {/* ===== Description ===== */}
      <p className="text-sm text-gray-600 dark:text-gray-300">
        {description}
      </p>

      {/* ===== Arrow (micro-interaction) ===== */}
      <div className="mt-4 flex justify-end text-gray-400">
        <span
          className="
            transform
            transition
            group-hover:translate-x-1
          "
        >
          →
        </span>
      </div>
    </div>
  );
}
