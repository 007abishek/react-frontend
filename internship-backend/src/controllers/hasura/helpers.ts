import { Request } from "express";
import { toPaymentStatus } from "../../shared/payments/paymentStatus";

export type HasuraSessionUser = {
  userId: number;
  firebaseUid: string;
};
//read headers safely
//validate hasura secrets (security)
//extract logged in user info from hasura session
export function getHeader(req: Request, key: string): string | null {
  const raw = req.headers[key.toLowerCase()];
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] : raw;
}
//verifies the request is actually coming from hasura
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
//extracts authenticated user info from  hasura request
export function getHasuraSessionUser(req: Request): HasuraSessionUser | null {
  const rawUserId = req.body?.session_variables?.["x-hasura-user-id"] as string | undefined;
  const rawFirebaseUid = req.body?.session_variables?.["x-hasura-firebase-uid"] as string | undefined;
  const userId = rawUserId ? parseInt(rawUserId, 10) : NaN;
  const firebaseUid = rawFirebaseUid?.trim();

  if (isNaN(userId) || !firebaseUid) return null;
  return { userId, firebaseUid };
}

export { toPaymentStatus };
//validate and normalize  user data
//function checks it and extracts valid identity