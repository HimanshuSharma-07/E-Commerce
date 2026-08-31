import {  Router} from "express"
import { addToCart, clearCart, getCartItems, removeFromCart, updateCart } from "../controllers/cart.controller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router =  Router()

router.post("/add-to-cart", verifyJWT, addToCart);
router.get("/all-cart-items", verifyJWT, getCartItems);
router.patch("/update-cart/:itemId", verifyJWT, updateCart);
router.delete("/remove/:itemId", verifyJWT, removeFromCart)
router.delete("/clear-cart", verifyJWT, clearCart)

export default router