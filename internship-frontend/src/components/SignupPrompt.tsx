import { useNavigate } from "react-router-dom";

export default function SignupPrompt({
  message,
}: {
  message: string;
}) {
  const navigate = useNavigate();

  return (
    <div
      className="
        fixed z-50
        bottom-3 left-3 right-3
        sm:bottom-6 sm:right-6 sm:left-auto
        sm:max-w-sm
        rounded-xl
        bg-black/90
        backdrop-blur-md
        p-4 sm:p-5
        text-white
        shadow-lg
      "
    >
      {/* Message */}
      <p className="text-sm sm:text-base mb-3 text-center sm:text-left">
        {message}
      </p>

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <button
          onClick={() => navigate("/signup")}
          className="
            w-full sm:w-auto
            rounded-lg
            bg-blue-600
            px-4 py-2
            text-sm
            hover:bg-blue-700
            transition
          "
        >
          Sign up
        </button>

        <button
          onClick={() => navigate("/login")}
          className="
            w-full sm:w-auto
            rounded-lg
            border border-white/30
            px-4 py-2
            text-sm
            hover:bg-white/10
            transition
          "
        >
          Login
        </button>
      </div>
    </div>
  );
}