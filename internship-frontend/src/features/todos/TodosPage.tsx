import { useEffect, useRef, useState } from "react";
import AppLayout from "../../components/layout/AppLayout";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  addTodo,
  toggleTodo,
  deleteTodo,
  setTodos,
} from "./todoSlice";
import {
  loadTodosForUser,
  saveTodosForUser,
} from "../../utils/indexedDb";
import SignupPrompt from "../../components/SignupPrompt";

export default function TodosPage() {
  const dispatch = useAppDispatch();

  const todos = useAppSelector((state) => state.todos.todos);
  const { user, loading } = useAppSelector((state) => state.auth);

  const isGuest = user?.provider === "guest";

  const [text, setText] = useState("");
  const [showPrompt, setShowPrompt] = useState(false);

  const hydrated = useRef(false);

  // ✅ Load todos after auth resolves
  useEffect(() => {
    if (loading) return;
    if (!user?.uid) return;

    loadTodosForUser(user.uid).then((storedTodos) => {
      dispatch(setTodos(storedTodos));
      hydrated.current = true;
    });
  }, [loading, user?.uid, dispatch]);

  // ✅ Save todos after hydration
  useEffect(() => {
    if (!hydrated.current) return;
    if (!user?.uid) return;

    saveTodosForUser(user.uid, todos);
  }, [todos, user?.uid]);

  const handleAdd = () => {
    if (!text.trim()) return;

    // 🔒 Guest restriction
    if (isGuest && todos.length >= 3) {
      setShowPrompt(true);
      return;
    }

    dispatch(addTodo(text));
    setText("");
  };

  return (
    <AppLayout>
      {/* ===== Header ===== */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Todos
        </h1>
        <p className="mt-1 text-slate-500">
          Keep track of what you need to do
        </p>
      </div>

      {/* ===== Input Card ===== */}
      <div className="mb-6 rounded-xl bg-white dark:bg-zinc-900 shadow-sm p-4">
        <div className="flex gap-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="
              flex-1
              rounded-md
              border border-slate-300 dark:border-zinc-700
              bg-white dark:bg-zinc-800
              px-3 py-2
              text-slate-900 dark:text-white
              placeholder-slate-400
              focus:outline-none
              focus:ring-2 focus:ring-blue-500
            "
            placeholder={
              isGuest
                ? "Guest users can add up to 3 todos"
                : "What needs to be done?"
            }
          />

          <button
            type="button"
            onClick={handleAdd}
            className="
              rounded-md
              bg-blue-600
              px-5 py-2
              font-medium text-white
              transition
              hover:bg-blue-700
            "
          >
            Add
          </button>
        </div>
      </div>

      {/* ===== Todo List ===== */}
      <ul className="space-y-3">
        {todos.length === 0 && (
          <li className="text-slate-400 text-sm text-center py-6">
            No todos yet. Add one above 👆
          </li>
        )}

        {todos.map((todo) => (
          <li
            key={todo.id}
            className="
              group
              flex items-center justify-between
              rounded-xl
              bg-white dark:bg-zinc-900
              p-4
              shadow-sm
              transition
              hover:shadow-md
            "
          >
            <div className="flex items-center gap-3 flex-1">
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() =>
                  dispatch(toggleTodo(todo.id))
                }
                className="
                  h-4 w-4
                  cursor-pointer
                  accent-blue-600
                "
              />

              <span
                className={`select-none transition ${
                  todo.completed
                    ? "line-through text-slate-400 italic"
                    : "text-slate-900 dark:text-white"
                }`}
              >
                {todo.text}
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                dispatch(deleteTodo(todo.id))
              }
              className="
                ml-3
                text-slate-400
                transition
                hover:text-red-500
                opacity-0 group-hover:opacity-100
              "
              aria-label="Delete todo"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      {/* 🔔 Signup prompt for guest users */}
      {showPrompt && (
        <SignupPrompt message="Sign up to create unlimited todos" />
      )}
    </AppLayout>
  );
}
