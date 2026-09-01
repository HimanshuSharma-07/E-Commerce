import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import type { AuthRequest } from "../types/types.js";
import { prisma } from "../utils/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";


const createOrder = asyncHandler(async (req: AuthRequest, res: Response) => {

    const { addressId } = req.body

    const cart = await prisma.cart.findUnique({
        where: { 
            userId: req.user.id
        },
        include: {
            items: {
                include: {
                    product: {
                        include: {
                            inventory: true
                        }
                    }
                }
            }
        }
        
    })

    if (!cart) {
        throw new ApiError(404, "Cart not found")
    }

    if(cart.items.length === 0){
        throw new ApiError(400, "Cart is Empty")
    }


    const cartItems = cart.items;

    for (const item of cartItems) {

        if (!item.product.inventory) {
            throw new ApiError(
                404,
                `Inventory not found for ${item.product.name}`
            );
        }

        const availableStock =
            item.product.inventory.quantity -
            item.product.inventory.reserved;

        if (item.quantity > availableStock) {
            throw new ApiError(
                400,
                `Only ${availableStock} ${item.product.name} left`
            );
        }
    }
    
    let totalAmount = 0;

    for(const item of cartItems){
        totalAmount += item.product.price * item.quantity
    }
    
    const address = await prisma.address.findFirst({
        where: {
            id: addressId,
            userId: req.user.id
        }
    }) 

    if (!address) {
        throw new ApiError(404, "Address not found")
    }

    const order = await prisma.$transaction(async(tx) => {

        const order = await tx.order.create({
            data: {
                userId: req.user.id,
                addressId: address.id,
                totalAmount,
                status: "PENDING",
                paymentStatus: "PENDING",
    
            }
        })
    
            for(const item of cartItems){
            await tx.orderItem.create({
                data: {
                    productId: item.productId,
                    orderId: order.id,
                    unitPrice: item.product.price,
                    quantity: item.quantity
                }
            })
        }
    
        for(const item of cartItems){
            await tx.inventory.update({
                where: {
                    productId: item.productId
                },
                data: {
                    quantity: {
                        decrement: item.quantity
                    }
                }
            })
        }
    
        await tx.cart.deleteMany({
            where: {
                id: cart.id
            }
        })

        return order

    })

    return res
    .status(201)
    .json(
        new ApiResponse(201, order, "Order Created Successfully")
    )
    
})

const getMyOrders = asyncHandler(async (req: AuthRequest, res: Response) => {

    const orders = await prisma.order.findMany({
        where: {
            userId: req.user.id
        },
        include: {
            orderItems: {
                include: {
                    product: true
                }
            },
            address: true
        },
        orderBy: {
            createdAt: "desc"
        }
    })

    if(orders.length === 0){
        return res.status(200).json(
            new ApiResponse(200, [], "No Order Found")
        )
    }

    return res.status(200)
    .json(
        new ApiResponse(200, orders, "Orders Fetched Successfully")
    )
})

const getOrderById = asyncHandler(async (req: AuthRequest, res: Response) => {

    const orderId = String(req.params.orderId)

    const order = await prisma.order.findFirst({
        where: {
            id: orderId,
            userId: req.user.id
        },
        include: {
            orderItems: {
                include: {
                    product: true
                }
            },
            address: true,
            payment: true
        },
    })

    if (!order) {
        throw new ApiError(404, "Order not Found")
    }

    return res.status(200)
    .json(
        new ApiResponse(200, order, "Order fetched Successfully ")
    )
})

const cancelOrder = asyncHandler(async (req: AuthRequest, res: Response) => {

    const orderId = String(req.params.orderId)

    const order = await prisma.order.findFirst({
        where: {
            id: orderId,
            userId: req.user.id
        },
        include: {
            orderItems: true
        }
    })

    if (!order) {
        throw new ApiError(404, "Order not found");
    }

    if(
        order.status !== "PENDING" && 
        order.status !== "CONFIRMED"
    ){
        throw new ApiError(400, "Order can not be cancelled")
    }

    const cancelledOrder = await prisma.$transaction(async (tx) =>{

        const updateOrder = await tx.order.update({
            where: {
                id: order.id
            },
            data: {
                status: "CANCELLED"
            }
        });

        for(const item of order.orderItems){
            
            await tx.inventory.update({
                where: {
                    productId: item.productId
                },
                data: {
                    quantity: {
                        increment: item.quantity
                    }
                }
            })
        }

        return updateOrder;
    })

    return res
    .status(200)
    .json(
        new  ApiResponse(200, cancelledOrder, "Order Cancelled Successfully")
    )
})



export {
    createOrder,
    getMyOrders,
    getOrderById,
    cancelOrder
}