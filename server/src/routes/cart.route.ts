import {  Router} from "express"
import { addToCart, getCartItems } from "../controllers/cart.controller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router =  Router()

router.post("/add-to-cart", verifyJWT, addToCart)
router.get("/all-cart-items", verifyJWT, getCartItems)


export default router