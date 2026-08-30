import type { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import jwt, { type JwtPayload } from "jsonwebtoken"
import { prisma } from "../utils/prismas.js";
import type { AuthRequest } from "../types/types.js";



export const verifyJWT = asyncHandler( async (req: AuthRequest, _: Response, next: NextFunction) => {

    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
    
    if (!token) {
        throw new ApiError(401, "Unauthorized Request")
    }

    const decodeToken = jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET as string,

    ) as JwtPayload & {id: string}
    

    const user = await prisma.user.findUnique({
        where: {
            id: decodeToken.id
        },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            updatedAt: true,
            createdAt: true,
        }
    })

    if (!user) {
        throw new ApiError(401, "Invalid Access Token");
    }

    req.user = user;

    next();

})


export const verifyAdmin = asyncHandler(async (req: AuthRequest, _: Response, next: NextFunction) => {
    if(req.user?.role !== "ADMIN"){
        throw new ApiError(403, "Access Denied, Admin Only");
    }

    next();
});