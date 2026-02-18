import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { initDb }      from "./config/db";
import authRoutes      from "./routes/auth";
import productRoutes   from "./routes/products"; // ← ADD
import cartRoutes      from "./routes/cart";

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: [
        "http://localhost:5173",
        "http://localhost:5174",
      
  ],
  credentials: true,
}))
;
app.use(express.json());
app.use(morgan("dev"));

// ─── Routes ───────────────────────────────────────────────────
app.use("/auth",     authRoutes);
app.use("/products", productRoutes); // ← ADD
app.use("/cart",     cartRoutes);
// ─── Health Check ─────────────────────────────────────────────
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// ─── Start ────────────────────────────────────────────────────
const start = async (): Promise<void> => {
  try {
    console.log("🔄 Connecting to database...");
    await initDb();
    console.log("✅ Database connected");

    app.listen(PORT, () => {
      console.log(`🚀 API running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

start();
