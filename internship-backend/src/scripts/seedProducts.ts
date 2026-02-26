import "dotenv/config";
import { initDb, pool } from "../config/db";
import db from "../config/knex";

// ─── Categories to seed ───────────────────────────────────────
const CATEGORIES = [
  "beauty",
  "furniture",
  "groceries",
  "electronics",
  "fragrances",
  "skincare",
];

// ─── DummyJSON Product shape ──────────────────────────────────
interface DummyProduct {
  id:          number;
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

// ─── Fetch one category from DummyJSON ────────────────────────
const fetchCategory = async (category: string): Promise<DummyProduct[]> => {
  console.log(`  📦 Fetching category: ${category}...`);

  const res  = await fetch(
    `https://dummyjson.com/products/category/${category}?limit=100`
  );
  const data = await res.json() as { products: DummyProduct[] };
  console.log(`  ✅ Got ${data.products.length} products for ${category}`);
  return data.products;
};

// ─── Insert one product into Postgres ────────────────────────
const insertProduct = async (p: DummyProduct): Promise<void> => {
  await db("products")
    .insert({
      external_id: p.id,
      title: p.title,
      description: p.description,
      price: p.price,
      category: p.category,
      thumbnail: p.thumbnail,
      images: p.images,
      rating: p.rating,
      stock: p.stock,
      brand: p.brand ?? "Unknown",
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
      brand: p.brand ?? "Unknown",
    });
};

// ─── Main seed function ───────────────────────────────────────
const seed = async (): Promise<void> => {
  console.log("🌱 Starting product seed...\n");

  try {
    // 1. Make sure tables exist
    await initDb();

    let totalInserted = 0;

    // 2. Fetch + insert each category
    for (const category of CATEGORIES) {
      const products = await fetchCategory(category);

      for (const product of products) {
        await insertProduct(product);
        totalInserted++;
      }
    }

    // 3. Verify
    const result = await db("products")
      .count<{ count: string }>("* as count")
      .first();
    const count = result?.count ?? "0";

    console.log(`\n✅ Seed complete!`);
    console.log(`   Inserted/updated: ${totalInserted} products`);
    console.log(`   Total in DB:      ${count} products`);

  } catch (err: any) {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  } finally {
    await db.destroy();
    await pool.end();
  }
};

seed();
