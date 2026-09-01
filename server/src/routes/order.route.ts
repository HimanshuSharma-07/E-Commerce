import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { cancelOrder, createOrder, getMyOrders, getOrderById } from "../controllers/order.controller.js";

const router = Router()


router.post("/create-order", verifyJWT, createOrder)
router.get("/all-orders", verifyJWT, getMyOrders)
router.get("/:orderId", verifyJWT, getOrderById)
router.patch("/cancel-order/:orderId", verifyJWT, cancelOrder)


export default router