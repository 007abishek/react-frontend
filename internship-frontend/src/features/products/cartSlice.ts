import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

/* ==============================
   TYPES
================================ */
export interface CartItem {
  id: number;
  title: string;
  price: number;

  // Image handling
  thumbnail: string;
  images: string[];

  quantity: number;
}

interface CartState {
  items: CartItem[];
}

/* ==============================
   INITIAL STATE
================================ */
const initialState: CartState = {
  items: [],
};

/* ==============================
   HELPERS
================================ */
const safeNumber = (value: unknown, fallback = 0) =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;

/* ==============================
   SLICE
================================ */
const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    // Replace entire cart (auth / persistence)
    setCart: (state, action: PayloadAction<CartItem[]>) => {
      state.items = action.payload.map((item) => ({
        ...item,
        price: safeNumber(item.price, 0),
        quantity: safeNumber(item.quantity, 1),
      }));
    },

    addToCart: (state, action: PayloadAction<CartItem>) => {
      const incoming: CartItem = {
        ...action.payload,
        price: safeNumber(action.payload.price, 0),
        quantity: safeNumber(action.payload.quantity, 1),
      };

      const existingItem = state.items.find(
        (item) => item.id === incoming.id
      );

      if (existingItem) {
        existingItem.quantity = safeNumber(existingItem.quantity, 1);
        existingItem.quantity += incoming.quantity;
      } else {
        state.items.push(incoming);
      }
    },

    increaseQty: (state, action: PayloadAction<number>) => {
      const item = state.items.find(
        (item) => item.id === action.payload
      );
      if (!item) return;

      item.quantity = safeNumber(item.quantity, 1);
      item.quantity += 1;
    },

    decreaseQty: (state, action: PayloadAction<number>) => {
      const item = state.items.find(
        (item) => item.id === action.payload
      );
      if (!item) return;

      item.quantity = safeNumber(item.quantity, 1);
      if (item.quantity > 1) {
        item.quantity -= 1;
      }
    },

    removeFromCart: (state, action: PayloadAction<number>) => {
      state.items = state.items.filter(
        (item) => item.id !== action.payload
      );
    },

    clearCart: (state) => {
      state.items = [];
    },
  },
});

/* ==============================
   EXPORTS
================================ */
export const {
  setCart,
  addToCart,
  increaseQty,
  decreaseQty,
  removeFromCart,
  clearCart,
} = cartSlice.actions;

export default cartSlice.reducer;
