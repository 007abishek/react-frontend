import { Router } from "express";
import {
  getProducts,
  getProductById,
  getProductsByCategory,
  searchProducts,
  getTopRated,
} from "../controllers/products.controller";

const router = Router();

// ─── Public Routes ────────────────────────────────────────────
// No auth needed — products are publicly browsable

// GET /products/search?q=mascara  ← must be BEFORE /:id
router.get("/search",           searchProducts);

// GET /products/top-rated?minRating=4.5  ← must be BEFORE /:id
router.get("/top-rated",        getTopRated);

// GET /products/category/beauty
router.get("/category/:name",   getProductsByCategory);

// GET /products
router.get("/",                 getProducts);

// GET /products/1
router.get("/:id",              getProductById);

export default router;