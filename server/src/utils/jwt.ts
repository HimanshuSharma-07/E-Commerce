import jwt from "jsonwebtoken"
import type { Role } from "../generated/prisma/enums.js";

export const generateAccessToken = (userId: string, email: string) => {
    return jwt.sign(
        {
            id: userId,
            email,
        },
        process.env.ACCESS_TOKEN_SECRET!,
        {
            expiresIn: "30m",
        }
    );
};

export const generateRefreshToken = (userId: string) =>{
    return jwt.sign(
        {
            id: userId,
        },
        process.env.REFRESH_TOKEN_SECRET!,
        {
            expiresIn: "30d",
        }
    )
}