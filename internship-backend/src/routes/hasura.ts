import { Router } from "express";
import { handleOrderInsertedEvent } from "../controllers/hasura.controller";

const router = Router();

router.post("/events/order-inserted", handleOrderInsertedEvent);

export default router;

