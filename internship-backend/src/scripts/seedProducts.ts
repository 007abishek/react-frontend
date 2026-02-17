import "dotenv/config";
import { pool, initDb } from "../config/db";

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
      p.id,
      p.title,
      p.description,
      p.price,
      p.category,
      p.thumbnail,
      p.images,
      p.rating,
      p.stock,
      p.brand ?? "Unknown",
    ]
  );
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
    const result = await pool.query(
      "SELECT COUNT(*) as count FROM products"
    );
    const count = result.rows[0].count;

    console.log(`\n✅ Seed complete!`);
    console.log(`   Inserted/updated: ${totalInserted} products`);
    console.log(`   Total in DB:      ${count} products`);

  } catch (err: any) {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

seed();