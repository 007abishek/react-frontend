import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

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
    setTodos: (state, action: PayloadAction<Todo[]>) => {
      state.todos = action.payload;
    },

    addTodo: (state, action: PayloadAction<string>) => {
      // throw new Error("Todo reducer crash test");
      state.todos.push({
        id: crypto.randomUUID(),
        text: action.payload,
        completed: false,
      });
    },

    toggleTodo: (state, action: PayloadAction<string>) => {
      const todo = state.todos.find(t => t.id === action.payload);
      if (todo) todo.completed = !todo.completed;
    },

    deleteTodo: (state, action: PayloadAction<string>) => {
      state.todos = state.todos.filter(t => t.id !== action.payload);
    },
  },
});

export const { setTodos, addTodo, toggleTodo, deleteTodo } =
  todoSlice.actions;

export default todoSlice.reducer;
