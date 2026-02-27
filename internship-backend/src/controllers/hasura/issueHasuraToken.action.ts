import { Request, Response } from "express";
import { issueHasuraTokenFromBackendJwt } from "../../services/hasura/auth.service";

export const handleIssueHasuraTokenAction = async (req: Request, res: Response) => {
  try {
    const backendJwt = req.body?.input?.backendJwt as string | undefined;
    if (!backendJwt) {
      res.status(400).json({ message: "backendJwt is required" });
      return;
    }

    const result = issueHasuraTokenFromBackendJwt(backendJwt);
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to issue Hasura token";
    console.error("handleIssueHasuraTokenAction error:", message);
    res.status(401).json({ message: "Unauthorized" });
  }
};
