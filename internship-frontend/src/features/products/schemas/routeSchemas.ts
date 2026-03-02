import { z } from "zod";

export const productIdParamSchema = z.coerce
  .number()
  .int("Invalid product id")
  .positive("Invalid product id");

export const orderIdParamSchema = z
  .string()
  .trim()
  .min(1, "Order id is required")
  .max(120, "Invalid order id");
