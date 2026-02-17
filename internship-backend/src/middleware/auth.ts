import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";

// Extend Express Request to include user
export interface AuthRequest extends Request {
  user?: {
    userId:   number;
    uid:      string;
    email:    string | null;
    provider: string;
    isGuest:  boolean;
  };
}

const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  // Get token from header: "Authorization: Bearer <token>"
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    res.status(401).json({ message: "No token provided" });
    return;
  }

  try {
    // Verify and attach user to request
    req.user = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as AuthRequest["user"];
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

export default authenticate;