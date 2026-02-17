import { Request, Response } from "express";
import ProductModel from "../models/product.model";

// ─── GET /products ────────────────────────────────────────────
// Returns { products: [...] } — exact same shape as DummyJSON
// ─────────────────────────────────────────────────────────────
export const getProducts = async (req: Request, res: Response) => {
  try {
    const products = await ProductModel.getAll();

    // DummyJSON shape — frontend expects this exact structure
    res.json({
      products,
      total: products.length,
      skip:  0,
      limit: products.length,
    });
  } catch (err: any) {
    console.error("getProducts error:", err.message);
    res.status(500).json({ message: "Failed to fetch products" });
  }
};

// ─── GET /products/:id ────────────────────────────────────────
// Returns single product object — same shape as DummyJSON
// ─────────────────────────────────────────────────────────────
export const getProductById = async (req: Request, res: Response) => {
  try {
    const idParam=req.params.id;
    if(Array.isArray(idParam)){
        res.status(400).json({message: "Invalid product Id"});
        return;
    }
    const id=parseInt(idParam);

    if (isNaN(id)) {
      res.status(400).json({ message: "Invalid product ID" });
      return;
    }

    const product = await ProductModel.getById(id);

    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    res.json(product);
  } catch (err: any) {
    console.error("getProductById error:", err.message);
    res.status(500).json({ message: "Failed to fetch product" });
  }
};

// ─── GET /products/category/:name ────────────────────────────
// Returns { products: [...] } filtered by category
// ─────────────────────────────────────────────────────────────
export const getProductsByCategory = async (req: Request, res: Response) => {
  try {
    const nameParam=req.params.name;
    if (!nameParam || Array.isArray(nameParam)){
        res.status(400).json({message: "Invalid category name"});
        return;
    }
    const products=await ProductModel.getByCategory(nameParam);

    res.json({
      products,
      total: products.length,
      skip:  0,
      limit: products.length,
    });
  } catch (err: any) {
    console.error("getProductsByCategory error:", err.message);
    res.status(500).json({ message: "Failed to fetch products" });
  }
};

// ─── GET /products/search?q= ──────────────────────────────────
// Returns { products: [...] } matching search query
// ─────────────────────────────────────────────────────────────
export const searchProducts = async (req: Request, res: Response) => {
  try {
    const q = req.query.q as string;

    if (!q || q.trim() === "") {
      res.status(400).json({ message: "Search query required" });
      return;
    }

    const products = await ProductModel.search(q.trim());

    res.json({
      products,
      total: products.length,
      skip:  0,
      limit: products.length,
    });
  } catch (err: any) {
    console.error("searchProducts error:", err.message);
    res.status(500).json({ message: "Failed to search products" });
  }
};

// ─── GET /products/top-rated?minRating= ──────────────────────
// Returns top rated products — used by your productsPageConfig
// ─────────────────────────────────────────────────────────────
export const getTopRated = async (req: Request, res: Response) => {
  try {
    const minRating = parseFloat(req.query.minRating as string) || 4.5;
    const products  = await ProductModel.getTopRated(minRating);

    res.json({
      products,
      total: products.length,
      skip:  0,
      limit: products.length,
    });
  } catch (err: any) {
    console.error("getTopRated error:", err.message);
    res.status(500).json({ message: "Failed to fetch top rated products" });
  }
};