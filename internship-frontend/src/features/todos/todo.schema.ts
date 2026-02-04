import { z } from "zod";

// ✅ Validate JUST the text (matches Redux PayloadAction<string>)
export const todoTextSchema = z
  .string()
  .trim()
  .min(1, "Todo cannot be empty")
  .max(100, "Todo must be at most 100 characters");

// (Optional) If you want a named type
export type TodoText = z.infer<typeof todoTextSchema>;
