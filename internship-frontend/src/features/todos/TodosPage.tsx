import { useEffect, useRef, useState } from "react";
import AppLayout from "../../components/layout/AppLayout";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { todoTextSchema } from "./todo.schema";
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
  const PAGE_SIZE = 8;
  const dispatch = useAppDispatch();

  const todos = useAppSelector((state) => state.todos.todos);
  const { user, loading } = useAppSelector((state) => state.auth);

  const isGuest = user?.provider === "guest";

  const [text, setText] = useState("");
  const [showPrompt, setShowPrompt] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const hydrated = useRef(false);
  const totalTodos = todos.length;
  const completedTodos = todos.filter((todo) => todo.completed).length;
  const progressPercent = totalTodos === 0 ? 0 : Math.round((completedTodos / totalTodos) * 100);
  const totalPages = Math.max(1, Math.ceil(totalTodos / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleTodos = todos.slice(startIndex, startIndex + PAGE_SIZE);

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

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleAdd = () => {
    // ✅ Zod validation (CORRECT)
    const result = todoTextSchema.safeParse(text);

    if (!result.success) {
      console.warn(result.error.issues[0].message);
      return;
    }

    // 🔒 Guest restriction
    if (isGuest && todos.length >= 3) {
      setShowPrompt(true);
      return;
    }

    // ✅ Use validated + trimmed value
    dispatch(addTodo(result.data));
    setText("");
  };

  const handleDeleteRequest = (todoId: string) => {
    setPendingDeleteId(todoId);
  };

  const handleDeleteConfirm = () => {
    if (!pendingDeleteId) return;
    dispatch(deleteTodo(pendingDeleteId));
    setPendingDeleteId(null);
  };

  const handleDeleteCancel = () => {
    setPendingDeleteId(null);
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
            maxLength={100}
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

      {/* ===== Progress ===== */}
      <div className="mb-6 rounded-xl bg-white p-4 shadow-sm dark:bg-zinc-900">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Progress</span>
          <span className="text-slate-500 dark:text-slate-400">
            {completedTodos}/{totalTodos} completed ({progressPercent}%)
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-700">
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
            aria-label={`Todo completion ${progressPercent}%`}
          />
        </div>
      </div>

      {/* ===== Todo List ===== */}
      <ul className="space-y-3">
        {todos.length === 0 && (
          <li className="text-slate-400 text-sm text-center py-6">
            No todos yet. Add one above 👆
          </li>
        )}

        {visibleTodos.map((todo) => (
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
              onClick={() => handleDeleteRequest(todo.id)}
              className="
                ml-3
                text-red-600
                transition
                hover:text-red-700
              "
              aria-label="Delete todo"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      {totalTodos > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-slate-200 dark:hover:bg-zinc-800"
          >
            Previous
          </button>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Page {currentPage} of {totalPages}
          </p>
          <button
            type="button"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-slate-200 dark:hover:bg-zinc-800"
          >
            Next
          </button>
        </div>
      )}

      {/* 🔔 Signup prompt for guest users */}
      {showPrompt && (
        <SignupPrompt message="Sign up to create unlimited todos" />
      )}

      {pendingDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl dark:bg-zinc-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Delete Todo
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Are you sure you want to delete this todo?
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleDeleteCancel}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100 dark:border-zinc-700 dark:text-slate-200 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
