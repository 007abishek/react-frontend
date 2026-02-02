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
      className="cursor-pointer bg-gray-100 dark:bg-gray-800 p-6 rounded-xl shadow hover:scale-105 transition"
    >
      <h2 className="text-lg font-bold mb-2">{title}</h2>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        {description}
      </p>
    </div>
  );
}
