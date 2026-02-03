import { useNavigate } from "react-router-dom";

interface FeatureCardProps {
  title: string;
  description: string;
  route: string;
}

export default function FeatureCard({
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
        p-6 rounded-2xl
        bg-gradient-to-br
        from-indigo-500/10 via-sky-500/10 to-purple-500/10
        dark:from-indigo-500/20 dark:via-sky-500/20 dark:to-purple-500/20
        border border-white/10
        shadow-sm
        hover:shadow-xl
        hover:scale-[1.03]
        transition-all duration-300
        group
      "
    >
      <h2
        className="
          text-xl font-semibold
          text-gray-900 dark:text-white
          mb-2
          group-hover:text-indigo-500
          transition-colors
        "
      >
        {title}
      </h2>

      <p className="text-sm text-gray-600 dark:text-gray-300">
        {description}
      </p>
    </div>
  );
}
