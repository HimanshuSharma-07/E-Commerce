import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import { createPaymentOrder, verifyPayment } from "../controllers/payment.controller.js"

const router = Router()


router.post("/create", verifyJWT, createPaymentOrder)
router.post("/verify", verifyJWT, verifyPayment)



export default router