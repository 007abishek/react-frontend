import { Router, Request, Response } from "express";
import * as jwt from "jsonwebtoken";
import admin from "../config/firebase";
import { pool } from "../config/db";
import authenticate, { AuthRequest } from "../middleware/auth";

const router = Router();

// ─── Types ────────────────────────────────────────────────────
interface LoginBody {
  firebaseIdToken: string;
}

interface UserRow {
  id:           number;
  firebase_uid: string;
  email:        string | null;
  provider:     string;
  is_guest:     boolean;
}

// ─── POST /auth/login (PUBLIC) ────────────────────────────────
// Frontend sends Firebase ID token → backend returns your JWT
// Works for ALL providers: email, google, github, guest
// ─────────────────────────────────────────────────────────────
router.post("/login", async (req: Request<{}, {}, LoginBody>, res: Response) => {
  try {
    const { firebaseIdToken } = req.body;

    if (!firebaseIdToken) {
      res.status(400).json({ message: "firebaseIdToken is required" });
      return;
    }

    // 1. Verify the Firebase token is real and not expired
    const decoded = await admin.auth().verifyIdToken(firebaseIdToken);

    // 2. Figure out which provider was used
    const providerId = decoded.firebase?.sign_in_provider;
    const providerMap: Record<string, string> = {
      "google.com": "google",
      "github.com": "github",
      "anonymous":  "guest",
      "password":   "password",
    };
    const provider = providerMap[providerId] || "password";
    const isGuest  = providerId === "anonymous";

    // 3. Save user to Postgres (or update if already exists)
    //    ON CONFLICT handles both new signup + returning login
    const result = await pool.query<UserRow>(
      `INSERT INTO users (firebase_uid, email, provider, is_guest)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (firebase_uid)
       DO UPDATE SET email = EXCLUDED.email
       RETURNING *`,
      [decoded.uid, decoded.email ?? null, provider, isGuest]
    );

    const user = result.rows[0];

    // 4. Sign YOUR JWT with user info
    const token = jwt.sign(
      {
        userId:   user.id,
        uid:      user.firebase_uid,
        email:    user.email,
        provider: user.provider,
        isGuest:  user.is_guest,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    );

    // 5. Send JWT + user back to frontend
    res.json({
      token,
      user: {
        id:       user.id,
        uid:      user.firebase_uid,
        email:    user.email,
        provider: user.provider,
        isGuest:  user.is_guest,
      },
    });

  } catch (err: any) {
    console.error("Login error:", err.message);
    res.status(401).json({ message: "Authentication failed" });
  }
});

// ─── GET /auth/me (PROTECTED) ─────────────────────────────────
// Requires: Authorization: Bearer <jwt>
// authenticate middleware verifies JWT and attaches req.user
// ─────────────────────────────────────────────────────────────
router.get("/me", authenticate, async (req: AuthRequest, res: Response) => {
  // No need to verify token again — middleware already did it
  // req.user is already decoded and attached
  res.json({
    user: {
      id:       req.user?.userId,
      uid:      req.user?.uid,
      email:    req.user?.email,
      provider: req.user?.provider,
      isGuest:  req.user?.isGuest,
    },
  });
});

router.post("/hasura-token", authenticate, (req: AuthRequest, res: Response) => {
  const hasuraJwtSecret = process.env.HASURA_JWT_SECRET;
  const user = req.user;

  if (!hasuraJwtSecret) {
    res.status(500).json({ message: "HASURA_JWT_SECRET is not configured" });
    return;
  }

  if (!user?.userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const isGuest = Boolean(user.isGuest);
  const defaultRole = isGuest ? "guest" : "user";
  const allowedRoles = isGuest ? ["guest"] : ["user"];

  const token = jwt.sign(
    {
      sub: String(user.uid),
      "https://hasura.io/jwt/claims": {
        "x-hasura-default-role": defaultRole,
        "x-hasura-allowed-roles": allowedRoles,
        "x-hasura-user-id": String(user.userId),
      },
    },
    hasuraJwtSecret,
    { expiresIn: "1h" }
  );

  res.json({ token });
});

export default router;
