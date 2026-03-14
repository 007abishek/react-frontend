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
  email_verified?: boolean;
}

type BackendJwtPayload = {
  userId: number;
  uid: string;
  isGuest?: boolean;
};

type DecodedFirebaseToken = {
  uid: string;
  email: string | null;
  providerId: string;
};

async function resolveFirebaseToken(firebaseIdToken: string): Promise<DecodedFirebaseToken> {
  try {
    const verified = await admin.auth().verifyIdToken(firebaseIdToken);
    return {
      uid: String(verified.uid),
      email: verified.email ?? null,
      providerId: verified.firebase?.sign_in_provider ?? "password",
    };
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw error;
    }

    // Local/dev fallback to keep auth flow working when Firebase admin creds are not configured.
    const decoded = jwt.decode(firebaseIdToken) as
      | {
          uid?: string;
          user_id?: string;
          sub?: string;
          email?: string | null;
          firebase?: { sign_in_provider?: string };
        }
      | null;

    const uid = decoded?.uid ?? decoded?.user_id ?? decoded?.sub;
    if (!uid) {
      throw new Error("Invalid firebase token payload");
    }

    return {
      uid: String(uid),
      email: decoded?.email ?? null,
      providerId: decoded?.firebase?.sign_in_provider ?? "password",
    };
  }
}

export async function authenticateFirebaseLogin(firebaseIdToken: string): Promise<{
  token: string;
  hasuraToken: string;
  user: {
    id: number;
    uid: string;
    email: string | null;
    provider: string;
    isGuest: boolean;
    emailVerified: boolean;
  };
}> {
  const decoded = await resolveFirebaseToken(firebaseIdToken);
  const providerId = decoded.providerId;
  const providerMap: Record<string, string> = {
    "google.com": "google",
    "github.com": "github",
    anonymous: "guest",
    password: "password",
  };
  const provider = providerMap[providerId] || "password";
  const isGuest = providerId === "anonymous";
  const autoVerifyEmail = isGuest || provider !== "password";

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
        ...(autoVerifyEmail ? { email_verified: true } : {}),
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
        ...(autoVerifyEmail ? { email_verified: true } : {}),
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
        ...(autoVerifyEmail ? { email_verified: true } : {}),
      })
      .returning("*");
    user = inserted[0];
  }
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
      emailVerified: Boolean(user.email_verified),
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
