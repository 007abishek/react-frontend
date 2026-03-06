import { hasuraRequest } from "../../../utils/hasuraClient";
import type { CartItem } from "../cartSlice";
import type { CartItemRow } from "./types";

export async function fetchCart(): Promise<CartItem[]> {
  const data = await hasuraRequest<{ cart_items: CartItemRow[] }>(
    `
      query GetCart {
        cart_items(order_by: { created_at: asc }) {
          id
          product_id
          title
          price
          thumbnail
          images
          quantity
        }
      }
    `
  );

  return data.cart_items.map((item) => ({
    id: item.product_id,
    title: item.title,
    price: Number(item.price),
    thumbnail: item.thumbnail,
    images: item.images ?? [],
    quantity: Number(item.quantity),
  }));
}

export async function syncCart(items: CartItem[]): Promise<void> {
  await hasuraRequest(
    `
      mutation ClearCart {
        delete_cart_items(where: {}) {
          affected_rows
        }
      }
    `
  );

  if (items.length === 0) return;

  await hasuraRequest(
    `
      mutation InsertCart($objects: [cart_items_insert_input!]!) {
        insert_cart_items(objects: $objects) {
          affected_rows
        }
      }
    `,
    {
      objects: items.map((item) => ({
        product_id: item.id,
        title: item.title,
        price: item.price,
        thumbnail: item.thumbnail,
        images: item.images ?? [],
        quantity: item.quantity,
      })),
    }
  );
}
