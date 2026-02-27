import { Request, Response } from "express";
import { authenticateFirebaseLogin } from "../../services/hasura/auth.service";

export const handleAuthLoginAction = async (req: Request, res: Response) => {
  try {
    const firebaseIdToken = req.body?.input?.firebaseIdToken as string | undefined;
    if (!firebaseIdToken) {
      res.status(400).json({ message: "firebaseIdToken is required" });
      return;
    }

    const result = await authenticateFirebaseLogin(firebaseIdToken);
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Authentication failed";
    console.error("handleAuthLoginAction error:", message);
    res.status(401).json({ message: "Authentication failed" });
  }
};
