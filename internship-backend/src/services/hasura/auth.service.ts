import * as jwt from "jsonwebtoken";
import admin from "../../config/firebase";
import db from "../../config/knex";
import { signHasuraToken } from "../../controllers/hasura/authToken";

interface UserRow {
  id: number;
  firebase_uid: string;
  email: string | null;
  provider: string;
  is_guest: boolean;
}

type BackendJwtPayload = {
  userId: number;
  uid: string;
  isGuest?: boolean;
};

export async function authenticateFirebaseLogin(firebaseIdToken: string): Promise<{
  token: string;
  hasuraToken: string;
  user: {
    id: number;
    uid: string;
    email: string | null;
    provider: string;
    isGuest: boolean;
  };
}> {
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

  const hasuraToken = signHasuraToken({
    userId: user.id,
    uid: user.firebase_uid,
    isGuest: user.is_guest,
  });

  return {
    token,
    hasuraToken,
    user: {
      id: user.id,
      uid: user.firebase_uid,
      email: user.email,
      provider: user.provider,
      isGuest: user.is_guest,
    },
  };
}

export function issueHasuraTokenFromBackendJwt(backendJwt: string): { token: string } {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not configured");
  }

  const decoded = jwt.verify(backendJwt, jwtSecret) as BackendJwtPayload;
  if (!decoded?.userId || !decoded?.uid) {
    throw new Error("Invalid backend JWT");
  }

  const token = signHasuraToken({
    userId: Number(decoded.userId),
    uid: String(decoded.uid),
    isGuest: Boolean(decoded.isGuest),
  });

  return { token };
}
