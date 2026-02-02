import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { Product } from "./types";

/* ==============================
   TYPES
================================ */
export interface CartItem extends Product {
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
   SLICE
================================ */
const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    /* 🛒 Add product to cart */
    addToCart(state, action: PayloadAction<Product>) {
      const item = state.items.find(
        (i) => i.id === action.payload.id
      );

      if (item) {
        item.quantity += 1;
      } else {
        state.items.push({
          ...action.payload,
          quantity: 1,
        });
      }
    },

    /* ➕ Increase quantity */
    increaseQty(state, action: PayloadAction<number>) {
      const item = state.items.find(
        (i) => i.id === action.payload
      );
      if (item) {
        item.quantity += 1;
      }
    },

    /* ➖ Decrease quantity (minimum 1) */
    decreaseQty(state, action: PayloadAction<number>) {
      const item = state.items.find(
        (i) => i.id === action.payload
      );

      if (!item) return;

      if (item.quantity > 1) {
        item.quantity -= 1;
      } else {
        // Optional UX: remove item if quantity reaches 0
        state.items = state.items.filter(
          (i) => i.id !== action.payload
        );
      }
    },

    /* ❌ Remove item completely */
    removeFromCart(state, action: PayloadAction<number>) {
      state.items = state.items.filter(
        (i) => i.id !== action.payload
      );
    },

    /* 🧹 Clear cart (on logout) */
    clearCart(state) {
      state.items = [];
    },

    /* 🔑 Hydrate cart from IndexedDB */
    setCart(state, action: PayloadAction<CartItem[]>) {
      state.items = action.payload;
    },
  },
});

/* ==============================
   EXPORTS
================================ */
export const {
  addToCart,
  increaseQty,
  decreaseQty,
  removeFromCart,
  clearCart,
  setCart,
} = cartSlice.actions;

export default cartSlice.reducer;
