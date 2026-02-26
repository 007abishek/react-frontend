import { Request, Response } from "express";
import * as jwt from "jsonwebtoken";
import admin from "../config/firebase";
import db from "../config/knex";
import { AuthRequest } from "../middleware/auth";

interface LoginBody {
  firebaseIdToken: string;
}

interface UserRow {
  id: number;
  firebase_uid: string;
  email: string | null;
  provider: string;
  is_guest: boolean;
}

export const login = async (req: Request<{}, {}, LoginBody>, res: Response) => {
  try {
    const { firebaseIdToken } = req.body;

    if (!firebaseIdToken) {
      res.status(400).json({ message: "firebaseIdToken is required" });
      return;
    }

    const decoded = await admin.auth().verifyIdToken(firebaseIdToken);

    const providerId = decoded.firebase?.sign_in_provider;
    const providerMap: Record<string, string> = {
      "google.com": "google",
      "github.com": "github",
      anonymous: "guest",
      password: "password",
    };
    const provider = providerMap[providerId] || "password";
    const isGuest = providerId === "anonymous";

    const users = await db<UserRow>("users")
      .insert({
        firebase_uid: decoded.uid,
        email: decoded.email ?? null,
        provider,
        is_guest: isGuest,
      })
      .onConflict("firebase_uid")
      .merge({
        email: decoded.email ?? null,
      })
      .returning("*");

    const user = users[0];

    const token = jwt.sign(
      {
        userId: user.id,
        uid: user.firebase_uid,
        email: user.email,
        provider: user.provider,
        isGuest: user.is_guest,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        uid: user.firebase_uid,
        email: user.email,
        provider: user.provider,
        isGuest: user.is_guest,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Authentication failed";
    console.error("login error:", message);
    res.status(401).json({ message: "Authentication failed" });
  }
};

export const me = async (req: AuthRequest, res: Response) => {
  res.json({
    user: {
      id: req.user?.userId,
      uid: req.user?.uid,
      email: req.user?.email,
      provider: req.user?.provider,
      isGuest: req.user?.isGuest,
    },
  });
};

export const getHasuraToken = (req: AuthRequest, res: Response) => {
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
        "x-hasura-firebase-uid": String(user.uid),
      },
    },
    hasuraJwtSecret,
    { expiresIn: "1h" }
  );

  res.json({ token });
};
