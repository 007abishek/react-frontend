import { z } from "zod";

const trimmedString = z.string().trim();

export const checkoutAddressSchema = z.object({
  fullName: trimmedString.min(2, "Full name must be at least 2 characters").max(80),
  phone: trimmedString.regex(/^\d{10}$/, "Phone number must be 10 digits"),
  email: trimmedString.email("Enter a valid email address"),
  addressLine1: trimmedString.min(5, "Address line 1 must be at least 5 characters").max(160),
  addressLine2: trimmedString
    .min(2, "Address line 2 is required")
    .max(160),
  city: trimmedString.min(2, "City is required").max(80),
  state: trimmedString.min(2, "State is required").max(80),
  pincode: trimmedString.regex(/^\d{6}$/, "Pincode must be 6 digits"),
});

export const checkoutPaymentMethodSchema = z.enum(["cod", "card"]);

export const checkoutItemSchema = z.object({
  id: z.number().int().positive(),
  quantity: z.number().int().positive(),
  price: z.number().nonnegative(),
});

export const checkoutItemsSchema = z
  .array(checkoutItemSchema)
  .min(1, "Cart is empty. Add items before checkout.");

export const checkoutTotalSchema = z
  .number()
  .positive("Total must be greater than zero")
  .finite("Total must be a valid number");

export type CheckoutAddress = z.infer<typeof checkoutAddressSchema>;
