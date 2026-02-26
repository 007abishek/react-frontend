import { Router } from "express";
import { getHasuraToken, login, me } from "../controllers/auth.controller";
import authenticate from "../middleware/auth";

const router = Router();

router.post("/login", login);
router.get("/me", authenticate, me);
router.post("/hasura-token", authenticate, getHasuraToken);

export default router;
