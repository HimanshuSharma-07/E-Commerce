import type { Request } from "express";
import type { User,  Cart } from "../generated/prisma/client.js";

export interface AuthRequest extends Request {
    user: Pick<
    User,
    "id" | "email" | "name"| "role" | "createdAt" | "updatedAt"
    >;
}

