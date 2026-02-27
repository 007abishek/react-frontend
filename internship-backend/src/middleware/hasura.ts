import { NextFunction, Request, Response } from "express";
import { getHasuraSessionUser, requireHasuraActionSecret, requireHasuraEventSecret } from "../controllers/hasura/helpers";

export type HasuraActionRequest = Request & {
  hasuraUser?: {
    userId: number;
    firebaseUid: string;
  };
};

export function ensureHasuraActionSecret(req: Request, res: Response, next: NextFunction): void {
  if (!requireHasuraActionSecret(req)) {
    res.status(401).json({ message: "Unauthorized Hasura action" });
    return;
  }
  next();
}

export function ensureHasuraEventSecret(req: Request, res: Response, next: NextFunction): void {
  if (!requireHasuraEventSecret(req)) {
    res.status(401).json({ message: "Unauthorized Hasura event" });
    return;
  }
  next();
}

export function attachHasuraSessionUser(req: HasuraActionRequest, res: Response, next: NextFunction): void {
  const session = getHasuraSessionUser(req);
  if (!session) {
    res.status(400).json({ message: "A valid Hasura user session is required" });
    return;
  }
  req.hasuraUser = session;
  next();
}
