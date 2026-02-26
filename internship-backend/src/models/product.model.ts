import db from "../config/knex";

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
  return db<ProductRow>("products")
    .select(
      "id",
      "external_id",
      "title",
      "description",
      "price",
      "category",
      "thumbnail",
      "images",
      "rating",
      "stock",
      "brand"
    )
    .orderBy("id", "asc");
};

// ─── Get products by category ─────────────────────────────────
const getByCategory = async (category: string): Promise<ProductRow[]> => {
  return db<ProductRow>("products")
    .select(
      "id",
      "external_id",
      "title",
      "description",
      "price",
      "category",
      "thumbnail",
      "images",
      "rating",
      "stock",
      "brand"
    )
    .whereRaw("LOWER(category) = LOWER(?)", [category])
    .orderBy("id", "asc");
};

// ─── Get single product by ID ─────────────────────────────────
const getById = async (id: number): Promise<ProductRow | null> => {
  const row = await db<ProductRow>("products")
    .select(
      "id",
      "external_id",
      "title",
      "description",
      "price",
      "category",
      "thumbnail",
      "images",
      "rating",
      "stock",
      "brand"
    )
    .where({ id })
    .first();

  return row ?? null;
};

// ─── Search products by title ─────────────────────────────────
const search = async (q: string): Promise<ProductRow[]> => {
  return db<ProductRow>("products")
    .select(
      "id",
      "external_id",
      "title",
      "description",
      "price",
      "category",
      "thumbnail",
      "images",
      "rating",
      "stock",
      "brand"
    )
    .whereRaw("LOWER(title) LIKE LOWER(?)", [`%${q}%`])
    .orderBy("id", "asc");
};

// ─── Get top rated products ───────────────────────────────────
const getTopRated = async (minRating: number): Promise<ProductRow[]> => {
  return db<ProductRow>("products")
    .select(
      "id",
      "external_id",
      "title",
      "description",
      "price",
      "category",
      "thumbnail",
      "images",
      "rating",
      "stock",
      "brand"
    )
    .where("rating", ">=", minRating)
    .orderBy("rating", "desc");
};

// ─── Bulk insert (used by seed script) ───────────────────────
const bulkInsert = async (
  products: Omit<ProductRow, "id">[]
): Promise<number> => {
  let inserted = 0;

  for (const p of products) {
    await db("products")
      .insert({
        external_id: p.external_id,
        title: p.title,
        description: p.description,
        price: p.price,
        category: p.category,
        thumbnail: p.thumbnail,
        images: p.images,
        rating: p.rating,
        stock: p.stock,
        brand: p.brand,
      })
      .onConflict("external_id")
      .merge({
        title: p.title,
        description: p.description,
        price: p.price,
        category: p.category,
        thumbnail: p.thumbnail,
        images: p.images,
        rating: p.rating,
        stock: p.stock,
        brand: p.brand,
      });
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
