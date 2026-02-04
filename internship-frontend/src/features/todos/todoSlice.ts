import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { todoTextSchema } from "./todo.schema"; // ✅ Zod validation

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

interface TodoState {
  todos: Todo[];
}

const initialState: TodoState = {
  todos: [],
};

const todoSlice = createSlice({
  name: "todos",
  initialState,
  reducers: {
    // ✅ Used when loading from IndexedDB
    setTodos: (state, action: PayloadAction<Todo[]>) => {
      state.todos = action.payload;
    },

    // ✅ Add todo with Zod validation (FINAL SAFETY NET)
    addTodo: (state, action: PayloadAction<string>) => {
      const parsed = todoTextSchema.safeParse(action.payload);

      if (!parsed.success) {
        // ❌ Invalid todo blocked
        return;
      }

      state.todos.push({
        id: crypto.randomUUID(),
        text: parsed.data, // ✅ trimmed + validated
        completed: false,
      });
    },

    toggleTodo: (state, action: PayloadAction<string>) => {
      const todo = state.todos.find(
        (t) => t.id === action.payload
      );
      if (todo) {
        todo.completed = !todo.completed;
      }
    },

    deleteTodo: (state, action: PayloadAction<string>) => {
      state.todos = state.todos.filter(
        (t) => t.id !== action.payload
      );
    },
  },
});

export const {
  setTodos,
  addTodo,
  toggleTodo,
  deleteTodo,
} = todoSlice.actions;

export default todoSlice.reducer;
