import type { Response } from "express";
import type { AuthRequest } from "../types/types.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { prisma } from "../utils/prisma.js";
import { ApiResponse } from "../utils/ApiResponse.js";



const createAddress = asyncHandler(async (req: AuthRequest, res: Response) => {

    const {streetAddress, city, state, pinCode, country } = req.body

    if (
        !streetAddress ||
        !city ||
        !state ||
        !pinCode ||
        !country
    ) {
        throw new ApiError(400, "All address fields are required");
    }

    const address = await prisma.address.create({
       data: {
        userId: req.user.id,
        streetAddress,
        city,
        state,
        pinCode,
        country
       }
    })

    return res.status(201)
    .json(
        new ApiResponse(201, address, "Address created Successfully")
    )

})

const updateAddress = asyncHandler(async (req: AuthRequest, res: Response) => {

    const addressId = String(req.params.addressId)

    const { streetAddress, city, state, pinCode, country} = req.body;

    const address = await prisma.address.findFirst({
        where: {
            id: addressId,
            userId: req.user.id
        }
    })

    if (!address) {
        throw new ApiError(404, "Address not Found")
    }

    const updateAddress = await prisma.address.update({
        where: {
            id: addressId,
        },
        data: { 
            ...(streetAddress !== undefined && { streetAddress }),
            ...(city !== undefined && { city }),
            ...(state !== undefined && { state }),
            ...(pinCode !== undefined && { pinCode }),
            ...(country !== undefined && { country })
        }
    })

    return res.status(200)
    .json(
        new ApiResponse(200, updateAddress, "Address Updated Successfully")
    )

})

// const deleteAddress = asyncHandler(async (req: AuthRequest, res: Response) => {

//     const addressId = String(req.params.addressId)

//     const address = await prisma.address.findFirst({
//         where: {
//             id: addressId,
//             userId: req.user.id
//         }
//     })

//     if (!address) {
//         throw new ApiError(404, "Address not Found")
//     }

//     await prisma.address.delete({
//         where: {
//             id: addressId
//         }
//     })

//     return res.status(200)
//     .json(
//         new ApiResponse(200, {}, "Address Deleted Successfully")
//     )
    
// })

export {
    createAddress,
    updateAddress
}