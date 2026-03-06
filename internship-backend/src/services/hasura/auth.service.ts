import * as jwt from "jsonwebtoken";
import admin from "../../config/firebase";
import db from "../../config/knex";
import { signHasuraToken } from "../../shared/auth/hasuraToken";

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

  // Resolve existing user by Firebase UID first, then by email to avoid
  // unique-email collisions when provider accounts are linked later.
  const existingByUid = await db<UserRow>("users")
    .where({ firebase_uid: decoded.uid })
    .first();

  const normalizedEmail = decoded.email ?? null;
  const existingByEmail =
    !existingByUid && normalizedEmail
      ? await db<UserRow>("users").where({ email: normalizedEmail }).first()
      : null;

  let user: UserRow;

  if (existingByUid) {
    const updated = await db<UserRow>("users")
      .where({ id: existingByUid.id })
      .update({
        email: normalizedEmail,
        provider,
        is_guest: isGuest,
      })
      .returning("*");
    user = updated[0];
  } else if (existingByEmail) {
    const updated = await db<UserRow>("users")
      .where({ id: existingByEmail.id })
      .update({
        firebase_uid: decoded.uid,
        email: normalizedEmail,
        provider,
        is_guest: isGuest,
      })
      .returning("*");
    user = updated[0];
  } else {
    const inserted = await db<UserRow>("users")
      .insert({
        firebase_uid: decoded.uid,
        email: normalizedEmail,
        provider,
        is_guest: isGuest,
      })
      .returning("*");
    user = inserted[0];
  }
  const token = signHasuraToken({
    userId: user.id,
    uid: user.firebase_uid,
    isGuest: user.is_guest,
    email: user.email,
    provider: user.provider,
    expiresIn: "7d",
  });
  const hasuraToken = token;

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
  const hasuraJwtSecret = process.env.HASURA_JWT_SECRET;
  if (!hasuraJwtSecret) {
    throw new Error("HASURA_JWT_SECRET is not configured");
  }

  const decoded = jwt.verify(backendJwt, hasuraJwtSecret) as BackendJwtPayload;
  if (!decoded?.userId || !decoded?.uid) {
    throw new Error("Invalid unified JWT");
  }

  return { token: backendJwt };
}
