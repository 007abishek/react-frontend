import { Request } from "express";

export type HasuraSessionUser = {
  userId: number;
  firebaseUid: string;
};

export function getHeader(req: Request, key: string): string | null {
  const raw = req.headers[key.toLowerCase()];
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] : raw;
}

export function requireHasuraActionSecret(req: Request): boolean {
  const configuredSecret = process.env.HASURA_ACTION_SECRET;
  if (!configuredSecret) return true;
  const secret = getHeader(req, "x-hasura-action-secret");
  return Boolean(secret && secret === configuredSecret);
}

export function requireHasuraEventSecret(req: Request): boolean {
  const configuredSecret = process.env.HASURA_EVENT_SECRET;
  if (!configuredSecret) return true;
  const secret = getHeader(req, "x-hasura-event-secret");
  return Boolean(secret && secret === configuredSecret);
}

export function getHasuraSessionUser(req: Request): HasuraSessionUser | null {
  const rawUserId = req.body?.session_variables?.["x-hasura-user-id"] as string | undefined;
  const rawFirebaseUid = req.body?.session_variables?.["x-hasura-firebase-uid"] as string | undefined;
  const userId = rawUserId ? parseInt(rawUserId, 10) : NaN;
  const firebaseUid = rawFirebaseUid?.trim();

  if (isNaN(userId) || !firebaseUid) return null;
  return { userId, firebaseUid };
}

export function toPaymentStatus(paymentMethod: string, orderStatus: string, rawPaymentStatus?: string): string {
  const normalizedMethod = paymentMethod.trim().toLowerCase();
  if (normalizedMethod === "cod") return "not_required";

  if (rawPaymentStatus) return rawPaymentStatus;

  const normalizedOrderStatus = orderStatus.trim().toLowerCase();
  if (normalizedOrderStatus === "cancelled") return "cancelled";
  if (
    normalizedOrderStatus === "confirmed" ||
    normalizedOrderStatus === "processing" ||
    normalizedOrderStatus === "shipped" ||
    normalizedOrderStatus === "delivered"
  ) {
    return "succeeded";
  }
  return "pending";
}
