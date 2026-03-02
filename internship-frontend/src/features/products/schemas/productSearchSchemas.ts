import { z } from "zod";

export const productSearchQuerySchema = z
  .string()
  .trim()
  .max(120, "Search query must be at most 120 characters");
