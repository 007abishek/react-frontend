import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cron from "node-cron";

import { initDb } from "./config/db";
import authRoutes from "./routes/auth";
import productRoutes from "./routes/products";
import cartRoutes from "./routes/cart";
import inventoryRoutes from "./routes/inventory";
import inventoryModel from "./models/inventory.model";
import orderRoutes from "./routes/orders";
import paymentRoutes   from "./routes/payments"; 
import { handleStripeWebhook } from "./controllers/payment.controller";


const app = express();
const PORT = process.env.PORT || 3001;

/* ============================================================
   MIDDLEWARE
============================================================ */

app.use(helmet());

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
    ],
    credentials: true,
  })
);

app.post(
  "/payments/stripe/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);

app.use(express.json());
app.use(morgan("dev"));

/* ============================================================
   ROUTES
============================================================ */

app.use("/auth", authRoutes);
app.use("/products", productRoutes);
app.use("/cart", cartRoutes);
app.use("/inventory", inventoryRoutes);
app.use("/orders",orderRoutes);
app.use("/payments",paymentRoutes);
/* ============================================================
   HEALTH CHECK
============================================================ */

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

/* ============================================================
   START SERVER + CRON
============================================================ */

const start = async (): Promise<void> => {
  try {
    console.log("🔄 Connecting to database...");
    await initDb();
    console.log("✅ Database connected");

    // 🚀 Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 API running on port ${PORT}`);
    });

    /* ============================================================
       INVENTORY CLEANUP CRON JOB
       Runs every minute
    ============================================================ */

    cron.schedule("* * * * *", async () => {
      console.log("⏳ Running inventory cleanup job...");

      try {
        const count = await inventoryModel.releaseExpired();

        if (count > 0) {
          console.log(`✅ Released ${count} expired reservations`);
        }
      } catch (err) {
        console.error("❌ Inventory cleanup error:", err);
      }
    });

    console.log("🕒 Inventory cleanup cron scheduled (every 1 minute)");

  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

start();
