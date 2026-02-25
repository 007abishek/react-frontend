import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
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
import hasuraRoutes from "./routes/hasura";


const app = express();
const PORT = process.env.PORT || 3001;
app.set("trust proxy", 1);

/* ============================================================
   MIDDLEWARE
============================================================ */

app.use(helmet());

const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://localhost:5174",
  ...(process.env.FRONTEND_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean) ?? []),
]);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser tools (no Origin header) and known local/dev frontend origins.
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);

      // Allow Vite dev server from private LAN IPs on common ports.
      const isPrivateLanViteOrigin =
        /^http:\/\/(?:192\.168|10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})(?::5173|:5174)?$/.test(origin);

      if (isPrivateLanViteOrigin) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

const enforceHttpsForPayments = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const shouldEnforce =
    process.env.NODE_ENV === "production" ||
    process.env.ENFORCE_HTTPS_PAYMENTS === "true";

  if (!shouldEnforce) {
    next();
    return;
  }

  const forwardedProtoHeader = req.headers["x-forwarded-proto"];
  const forwardedProto = Array.isArray(forwardedProtoHeader)
    ? forwardedProtoHeader[0]
    : forwardedProtoHeader;

  const isSecure =
    req.secure ||
    forwardedProto?.split(",")[0]?.trim().toLowerCase() === "https";

  if (isSecure) {
    next();
    return;
  }

  res.status(426).json({ message: "HTTPS required for payment endpoints" });
};

app.post(
  "/payments/stripe/webhook",
  enforceHttpsForPayments,
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);

// Backward-compatible Stripe webhook path used by older CLI forwarding commands.
app.post(
  "/payments/stripe",
  enforceHttpsForPayments,
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
app.use("/payments", enforceHttpsForPayments, paymentRoutes);
app.use("/hasura", hasuraRoutes);
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
