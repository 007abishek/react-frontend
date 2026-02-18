import { Router } from "express";

import { placeOrder } from "../controllers/order.controller";
import authenticate from "../middleware/auth";

const router=Router();

router.post("/",authenticate,placeOrder);

export default router;