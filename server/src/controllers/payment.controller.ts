import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { prisma } from "../utils/prisma.js";
import type { AuthRequest } from "../types/types.js";
import razorpay from "../utils/razorpay.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import crypto from "crypto";
import { updateProductDetails } from "./product.controller.js";

const createPaymentOrder = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { orderId } = req.body;

    if (!orderId) {
      throw new ApiError(400, "Order Id is requried");
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: req.user.id,
      },
    });

    if (!order) {
      throw new ApiError(404, "Order not found");
    }

    if (order.paymentStatus === "PAID") {
      throw new ApiError(400, "Order is already paid");
    }

    const existingPayment = await prisma.payment.findUnique({
      where: {
        orderId: order.id,
      },
    });

    if (existingPayment) {
      return res.status(200).json(
        new ApiResponse(
          200,
          {
            paymentOrderId: existingPayment.paymentOrderId,
            amount: existingPayment.amount * 100,
            currency: "INR",
          },
          "Payment order alreday exists"
        )
      );
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: order.totalAmount,
      currency: "INR",
      receipt: order.id,
    });

    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        paymentOrderId: razorpayOrder.id,
        status: "PENDING",
        amount: order.totalAmount,
      },
    });

    return res.status(200).json(
      new ApiResponse(200, {
        paymentId: payment.id,
        paymentOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
      })
    );
  }
);

const verifyPayment = asyncHandler(async (req: AuthRequest, res: Response) => {

        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;

        // 1. Validate payment details
        if (
            !razorpay_order_id ||
            !razorpay_payment_id ||
            !razorpay_signature
        ) {
            throw new ApiError(
                400,
                "Payment verification details are required"
            );
        }

        // 2. Find payment
        const payment = await prisma.payment.findUnique({
            where: {
                paymentOrderId: razorpay_order_id
            },
            include: {
                order: true
            }
        });

        if (!payment) {
            throw new ApiError(
                404,
                "Payment order not found"
            );
        }

        // 3. Check payment ownership
        if (payment.order.userId !== req.user.id) {
            throw new ApiError(
                403,
                "Unauthorized payment"
            );
        }

        // 4. Verify Razorpay signature
        const body =
            `${razorpay_order_id}|${razorpay_payment_id}`;

        const expectedSignature = crypto
            .createHmac(
                "sha256",
                process.env.RAZORPAY_KEY_SECRET!
            )
            .update(body)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            throw new ApiError(
                400,
                "Invalid payment Signature"
            );
        }

        // 5. Finalize payment inside transaction
        const result = await prisma.$transaction(
            async (tx) => {

                // Get latest payment status
                const currentPayment =
                    await tx.payment.findUnique({
                        where: {
                            id: payment.id
                        }
                    });

                if (!currentPayment) {
                    throw new ApiError(
                        404,
                        "Payment record not found"
                    );
                }

                // Prevent duplicate processing
                if (currentPayment.status === "PAID") {
                    return {
                        alreadyPaid: true,
                        payment: currentPayment,
                        order: payment.order
                    };
                }

                // Only PENDING payment can become PAID
                if (currentPayment.status !== "PENDING") {
                    throw new ApiError(
                        400,
                        `Payment cannot be verified from ${currentPayment.status} status`
                    );
                }

                // 6. Get order items
                const orderItems =
                    await tx.orderItem.findMany({
                        where: {
                            orderId: payment.orderId
                        }
                    });

                if (orderItems.length === 0) {
                    throw new ApiError(
                        400,
                        "Order items not found"
                    );
                }

                // 7. Finalize inventory
                for (const item of orderItems) {

                    const inventory =
                        await tx.inventory.findUnique({
                            where: {
                                productId: item.productId
                            }
                        });

                    if (!inventory) {
                        throw new ApiError(
                            404,
                            `Inventory not found for product ${item.productId}`
                        );
                    }

                    // Safety check
                    if (inventory.reserved < item.quantity) {
                        throw new ApiError(
                            400,
                            "Insufficient reserved inventory"
                        );
                    }

                    if (inventory.quantity < item.quantity) {
                        throw new ApiError(
                            400,
                            "Insufficient inventory"
                        );
                    }

                    await tx.inventory.update({
                        where: {
                            productId: item.productId
                        },
                        data: {
                            quantity: {
                                decrement: item.quantity
                            },
                            reserved: {
                                decrement: item.quantity
                            }
                        }
                    });
                }

                // 8. Update Payment
                const updatedPayment =
                    await tx.payment.update({
                        where: {
                            id: payment.id
                        },
                        data: {
                            paymentId: razorpay_payment_id,
                            status: "PAID"
                        }
                    });

                // 9. Update Order
                const updatedOrder =
                    await tx.order.update({
                        where: {
                            id: payment.orderId
                        },
                        data: {
                            paymentStatus: "PAID",
                            status: "CONFIRMED"
                        }
                    });

                return {
                    alreadyPaid: false,
                    payment: updatedPayment,
                    order: updatedOrder
                };
            },
            {
                isolationLevel: "Serializable"
            }
        );

        // 10. Response
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    result,
                    result.alreadyPaid
                        ? "Payment already verified"
                        : "Payment verified successfully"
                )
            );
    }
);

const razorpayWebhook = asyncHandler(async (req: Request, res: Response) => {
  const webhookSignature = req.headers["x-razorpay-signature"];

  if (!webhookSignature) {
    throw new ApiError(400, "Webhook signature is missing");
  }

  const webhookSecret = process.env.RAZORPAY_KEY_WEBHOOK_SECRET!;

  if (webhookSecret) {
    throw new ApiError(500, "webhook secret is not configured");
  }

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(req.body)
    .digest("hex");

  if (!expectedSignature) {
    throw new ApiError(400, "Invalid webhook signature");
  }

  const event = JSON.parse(req.body.toString());

  if (event.event === "payment.captured") {
    const paymentEntity = event.payload.payment.entity;

    const razorpayPaymentId = paymentEntity.id;

    const payment = await prisma.payment.findUnique({
      where: {
        paymentOrderId: razorpayPaymentId,
      },
    });

    if (!payment) {
      return res.status(200).json({
        success: true,
        message: "Payment record not found",
      });
    }

    if (payment.status === "PAID") {
      return res.status(200).json({
        sucess: true,
        message: "Payment alredy processed",
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          paymentId: razorpayPaymentId,
          status: "PAID",
        },
      });

      await tx.order.update({
        where: {
          id: payment.orderId,
        },
        data: {
          paymentStatus: "PAID",
          status: "CONFIRMED",
        },
      });
    });
  }

  if (event.event === "payment.failed") {
    const paymentEntity = event.payload.payment.entity;

    const razorpayPaymentId = paymentEntity.id;

    const payment = await prisma.payment.findUnique({
      where: {
        paymentOrderId: razorpayPaymentId,
      },
    });

    if (!payment) {
      return res.status(200).json({
        success: true,
        message: "Payment record not found",
      });
    }

    if (payment.status === "FAILED") {
      return res.status(200).json({
        sucess: true,
        message: "Payment alredy failed",
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          paymentId: razorpayPaymentId,
          status: "FAILED",
        },
      });

      await tx.order.update({
        where: {
          id: payment.orderId,
        },
        data: {
          paymentStatus: "FAILED",
        },
      });
    });
  }

  return res.status(200).json({ success: true });
});

const retryPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orderId = String(req.params.orderId);

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId: req.user.id,
    },
    include: {
      payment: true,
    },
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (!order.payment) {
    throw new ApiError(404, "Payment record not found");
  }

  if (order.payment.status === "PAID") {
    throw new ApiError(400, "Order is already paid");
  }

  if (order.status === "CANCELLED") {
    throw new ApiError(400, "Cancelled order cannot be paid");
  }

  const razorpayOrder = await razorpay.orders.create({
    amount: order.totalAmount,
    currency: "INR",
    receipt: order.id,
  });

  const updatedPayment = await prisma.payment.update({
    where: {
        orderId: order.id
    },
    data: {
        paymentOrderId: razorpayOrder.id,
        paymentId: null,
        status: "PENDING"
    }
  })



  return res.status(200).json(
    new ApiResponse(
        200,
        {
            orderId: order.id,
            paymentId: updatedPayment.id,
            paymentOrderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency

        },
        "Payment retry initiated successfully"
    )
  )
});

export { 
    createPaymentOrder, 
    verifyPayment, 
    razorpayWebhook,
    retryPayment     
};
