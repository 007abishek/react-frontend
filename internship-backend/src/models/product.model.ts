import { pool } from "../config/db";

// ─── Types ────────────────────────────────────────────────────
export interface ProductRow {
  id:          number;
  external_id: number;
  title:       string;
  description: string;
  price:       number;
  category:    string;
  thumbnail:   string;
  images:      string[];
  rating:      number;
  stock:       number;
  brand:       string;
}

// ─── Get all products ─────────────────────────────────────────
const getAll = async (): Promise<ProductRow[]> => {
  const res = await pool.query<ProductRow>(
    `SELECT id, external_id, title, description, price, category,
            thumbnail, images, rating, stock, brand
     FROM products
     ORDER BY id ASC`
  );
  return res.rows;
};

// ─── Get products by category ─────────────────────────────────
const getByCategory = async (category: string): Promise<ProductRow[]> => {
  const res = await pool.query<ProductRow>(
    `SELECT id, external_id, title, description, price, category,
            thumbnail, images, rating, stock, brand
     FROM products
     WHERE LOWER(category) = LOWER($1)
     ORDER BY id ASC`,
    [category]
  );
  return res.rows;
};

// ─── Get single product by ID ─────────────────────────────────
const getById = async (id: number): Promise<ProductRow | null> => {
  const res = await pool.query<ProductRow>(
    `SELECT id, external_id, title, description, price, category,
            thumbnail, images, rating, stock, brand
     FROM products
     WHERE id = $1`,
    [id]
  );
  return res.rows[0] || null;
};

// ─── Search products by title ─────────────────────────────────
const search = async (q: string): Promise<ProductRow[]> => {
  const res = await pool.query<ProductRow>(
    `SELECT id, external_id, title, description, price, category,
            thumbnail, images, rating, stock, brand
     FROM products
     WHERE LOWER(title) LIKE LOWER($1)
     ORDER BY id ASC`,
    [`%${q}%`]
  );
  return res.rows;
};

// ─── Get top rated products ───────────────────────────────────
const getTopRated = async (minRating: number): Promise<ProductRow[]> => {
  const res = await pool.query<ProductRow>(
    `SELECT id, external_id, title, description, price, category,
            thumbnail, images, rating, stock, brand
     FROM products
     WHERE rating >= $1
     ORDER BY rating DESC`,
    [minRating]
  );
  return res.rows;
};

// ─── Bulk insert (used by seed script) ───────────────────────
const bulkInsert = async (
  products: Omit<ProductRow, "id">[]
): Promise<number> => {
  let inserted = 0;

  for (const p of products) {
    await pool.query(
      `INSERT INTO products
        (external_id, title, description, price, category,
         thumbnail, images, rating, stock, brand)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (external_id) DO UPDATE SET
         title       = EXCLUDED.title,
         description = EXCLUDED.description,
         price       = EXCLUDED.price,
         category    = EXCLUDED.category,
         thumbnail   = EXCLUDED.thumbnail,
         images      = EXCLUDED.images,
         rating      = EXCLUDED.rating,
         stock       = EXCLUDED.stock,
         brand       = EXCLUDED.brand`,
      [
        p.external_id,
        p.title,
        p.description,
        p.price,
        p.category,
        p.thumbnail,
        p.images,
        p.rating,
        p.stock,
        p.brand,
      ]
    );
    inserted++;
  }

  return inserted;
};

export default {
  getAll,
  getByCategory,
  getById,
  search,
  getTopRated,
  bulkInsert,
};
