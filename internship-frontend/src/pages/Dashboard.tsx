import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-x-4">
      <button onClick={() => navigate("/todos")}>Todos</button>
      <button onClick={() => navigate("/products")}>Products</button>
      <button onClick={() => navigate("/github")}>GitHub</button>
    </div>
  );
}
