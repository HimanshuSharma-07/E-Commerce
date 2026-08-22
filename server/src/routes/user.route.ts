import { Router } from "express";
import { getAllUsers, loginUser, logoutUser, registerUser } from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.post("/register", registerUser);
router.post("/login", loginUser)


// secure routes
router.post("/logout", verifyJWT, logoutUser)
router.get("/all-users", getAllUsers)


export default router