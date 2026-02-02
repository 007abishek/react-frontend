import { useNavigate } from "react-router-dom";

export default function SignupPrompt({
  message,
}: {
  message: string;
}) {
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-6 right-6 bg-black text-white p-4 rounded-lg shadow-lg z-50">
      <p className="mb-2">{message}</p>

      <div className="flex gap-2">
        <button
          onClick={() => navigate("/signup")}
          className="bg-blue-600 px-3 py-1 rounded"
        >
          Sign up
        </button>

        <button
          onClick={() => navigate("/login")}
          className="border px-3 py-1 rounded"
        >
          Login
        </button>
      </div>
    </div>
  );
}
