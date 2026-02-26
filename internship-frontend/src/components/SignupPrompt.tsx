import { useNavigate } from "react-router-dom";

export default function SignupPrompt({
  message,
}: {
  message: string;
}) {
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-3 left-3 right-3 z-50 rounded-lg bg-black p-4 text-white shadow-lg sm:bottom-6 sm:left-auto sm:right-6 sm:w-auto">
      <p className="mb-2">{message}</p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          onClick={() => navigate("/signup")}
          className="rounded bg-blue-600 px-3 py-2"
        >
          Sign up
        </button>

        <button
          onClick={() => navigate("/login")}
          className="rounded border px-3 py-2"
        >
          Login
        </button>
      </div>
    </div>
  );
}
