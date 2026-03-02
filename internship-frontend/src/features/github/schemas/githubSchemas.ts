import { z } from "zod";

export const githubSearchQuerySchema = z
  .string()
  .trim()
  .min(1, "Search query is required")
  .max(100, "Search query must be at most 100 characters")
  .regex(/^[\w\s\-./]+$/, "Use letters, numbers, spaces, or - . / _");

export const githubPageSchema = z.number().int().min(1);
