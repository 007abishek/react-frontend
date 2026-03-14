import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../../app/store";
import type { CartItem } from "./cartSlice";
//extracts cart items from redux store
export const selectCartItems = (state: RootState): CartItem[] =>
  state.cart.items;
//used to calculate total number of items in the cart
export const selectCartCount = createSelector(
  [selectCartItems],
  (items) =>
    items.reduce(
      (sum, item) => sum + (Number(item.quantity) || 0),
      0
    )
);
//used to calculate the total price of all items in cart
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
