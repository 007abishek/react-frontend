import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../../app/store";
import type { CartItem } from "./cartSlice";

export const selectCartItems = (state: RootState): CartItem[] =>
  state.cart.items;

export const selectCartCount = createSelector(
  [selectCartItems],
  (items) =>
    items.reduce(
      (sum, item) => sum + (Number(item.quantity) || 0),
      0
    )
);

export const selectCartTotal = createSelector(
  [selectCartItems],
  (items) =>
    items.reduce(
      (sum, item) =>
        sum +
        (Number(item.price) || 0) *
          (Number(item.quantity) || 0),
      0
    )
);
