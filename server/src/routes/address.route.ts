import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createAddress, updateAddress } from "../controllers/address.controller.js";



const router = Router()


router.post("/create-address", verifyJWT, createAddress)
router.patch("/update-address/:addressId", verifyJWT, updateAddress)


export default router