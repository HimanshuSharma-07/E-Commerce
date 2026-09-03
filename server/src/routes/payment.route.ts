import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import { createPaymentOrder, razorpayWebhook, retryPayment, verifyPayment } from "../controllers/payment.controller.js"

const router = Router()


router.post("/create", verifyJWT, createPaymentOrder)
router.post("/verify", verifyJWT, verifyPayment)
router.post("webhook", razorpayWebhook)
router.post("/retry-payment/:orderId", verifyJWT, retryPayment)



export default router