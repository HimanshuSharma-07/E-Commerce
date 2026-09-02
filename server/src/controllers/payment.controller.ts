import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { prisma } from "../utils/prisma.js";
import type { AuthRequest } from "../types/types.js";
import razorpay from "../utils/razorpay.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import crypto from "crypto"
import { updateProductDetails } from "./product.controller.js";


const createPaymentOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
    
    const { orderId } = req.body

    if (!orderId) {
        throw new ApiError(400, "Order Id is requried")
    }

    const order = await prisma.order.findFirst({
        where: {
            id: orderId,
            userId: req.user.id 
        }
    })

    if (!order) {
        throw new ApiError(404, "Order not found")
    }

    if (order.paymentStatus === "PAID") {
        throw new ApiError(400, "Order is already paid")
    }


    const  existingPayment = await prisma.payment.findUnique({
        where: {
            orderId: order.id
        }
    })

    if (existingPayment) {
        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    paymentOrderId: existingPayment.paymentOrderId,
                    amount: existingPayment.amount * 100,
                    currency: "INR"
                },
                "Payment order alreday exists"
            )
        )   
    }

    const razorpayOrder = await razorpay.orders.create({
        amount: order.totalAmount,
        currency: "INR",
        receipt: order.id
    })

    const payment = await prisma.payment.create({
        data: {
            orderId: order.id,
            paymentOrderId: razorpayOrder.id,
            status: "PENDING",
            amount: order.totalAmount
        }
    })

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {
                paymentId: payment.id,
                paymentOrderId: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency
            }
        )
    )
})


const verifyPayment = asyncHandler(async (req: AuthRequest, res: Response) => {

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body

    if (
        !razorpay_order_id ||
        !razorpay_payment_id ||
        !razorpay_signature
    ) {
        throw new ApiError(400, "Payment verification details are required")
    }

    const payment = await prisma.payment.findUnique({
        where: {
            paymentOrderId: razorpay_order_id
        },
        include: {
            order: true
        }
    })

    if (!payment) {
        throw new ApiError(404, "Payment order not found")
    }

    if (payment.order.userId !== req.user.id) {
        throw new ApiError(403, "Unauthorized payment");
    }

    const body = `${razorpay_order_id|razorpay_payment_id}`

    const expectedSignature = crypto.createHmac(
        "sha256",
        process.env.RAZORPAY_KEY_SECRET!
    )
    .update(body)
    .digest("hex");


    if (expectedSignature !== razorpay_signature) {
        throw new ApiError(400, "Invalid payment Signature")
    }

    const updatedPayment = await  prisma.payment.update({
        where: {
            id: payment.id
        },
        data: {
            paymentId: razorpay_payment_id,
            status: "PAID"
        }
    })

    const updatedOrder  = await prisma.order.update({
        where: {
            id: payment.orderId
        },
        data: {
            paymentStatus: "PAID",
            status: "CONFIRMED"
        }
    })


    return res.status(200)
    .json(
        new ApiResponse(
            200,
            {
                payment: updatedPayment,
                order: updatedOrder
            },

        )
    )
})

export {
    createPaymentOrder,
    verifyPayment
}