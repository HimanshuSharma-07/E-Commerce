import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import type { AuthRequest } from "../types/types.js";
import { prisma } from "../utils/prismas.js";
import { ApiError } from "../utils/ApiError.js";


const createOrder = asyncHandler(async (req: AuthRequest, res: Response) => {

    const { addressId } = req.body

    const cart = await prisma.cart.findUnique({
        where: { userId: req.user.id}
    })

    if (!cart) {
        throw new ApiError(404, "Cart not found")
    }

    
})