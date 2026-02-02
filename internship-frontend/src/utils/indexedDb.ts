import { openDB } from "idb";
import type { Todo } from "../features/todos/todoSlice";
import type { CartItem } from "../features/products/cartSlice";

/* ==============================
   DB CONFIG
================================ */
const DB_NAME = "internship-app-db";
const DB_VERSION = 3;

/* Object Stores */
const TODO_STORE = "todos-by-user";
const CART_STORE = "cart-by-user";

/* ==============================
   DB INIT
================================ */
export const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    // ✅ TODOS STORE
    if (!db.objectStoreNames.contains(TODO_STORE)) {
      db.createObjectStore(TODO_STORE);
    }

    // ✅ CART STORE
    if (!db.objectStoreNames.contains(CART_STORE)) {
      db.createObjectStore(CART_STORE);
    }
  },
});

/* ==============================
   TODOS (per user)
================================ */
export async function loadTodosForUser(
  userId: string
): Promise<Todo[]> {
  const db = await dbPromise;
  return (await db.get(TODO_STORE, userId)) ?? [];
}

export async function saveTodosForUser(
  userId: string,
  todos: Todo[]
): Promise<void> {
  const db = await dbPromise;
  await db.put(TODO_STORE, todos, userId);
}

export async function clearTodosForUser(
  userId: string
): Promise<void> {
  const db = await dbPromise;
  await db.delete(TODO_STORE, userId);
}

/* ==============================
   CART (per user)
================================ */
export async function loadCartForUser(
  userId: string
): Promise<CartItem[]> {
  const db = await dbPromise;
  return (await db.get(CART_STORE, userId)) ?? [];
}

export async function saveCartForUser(
  userId: string,
  cart: CartItem[]
): Promise<void> {
  const db = await dbPromise;
  await db.put(CART_STORE, cart, userId);
}

export async function clearCartForUser(
  userId: string
): Promise<void> {
  const db = await dbPromise;
  await db.delete(CART_STORE, userId);
}
