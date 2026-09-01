import type { Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { prisma } from "../utils/prisma.js";
import type { AuthRequest } from "../types/types.js";
import { ApiResponse } from "../utils/ApiResponse.js";


const addToCart = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { productId, quantity } = req.body;

  console.log("poductId", productId)
  console.log("quantity", quantity)


  if (!productId) {
    throw new ApiError(400, "Product  Id is  required");
  }

  if (!quantity || quantity < 1) {
    throw new ApiError(400, "Quantity  must  be at least 1");
  }

  const product = await prisma.product.findUnique({
    where: {
      id: productId,
    },
    include: {
      inventory: true,
    },
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  if (!product.inventory) {
    throw new ApiError(404, "Inventory not found for this Product");
  }

  const availableStock =
    product.inventory.quantity - product.inventory.reserved;

  let cart = await prisma.cart.findUnique({
    where: {
      userId: req.user.id,
    },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: {
        userId: req.user.id,
      },
    });
  }

  const existedItem = await prisma.cartItem.findUnique({
    where: {
      cartId_productId: {
        cartId: cart.id,
        productId,
      },
    },
  });

  if (existedItem) {
    const newQuantity = existedItem.quantity + quantity;

    if (newQuantity > availableStock) {
      throw new ApiError(400, "Insufficient Stock");
    }

    const updatedItem = await prisma.cartItem.update({
      where: {
        id: existedItem.id,
      },
      data: {
        quantity: newQuantity,
      },
    });

    return res
      .status(200)
      .json(new ApiResponse(200, updatedItem, "Cart updated successfully"));
  }

  if (quantity > availableStock) {
    throw new ApiError(400, "Insufficient Stock");
  }

  const newItem = await prisma.cartItem.create({
    data: {
      cartId: cart.id,
      productId,
      quantity,
    },
  });

  return res
    .status(201)
    .json(new ApiResponse(201, newItem, "Product added to cart successfully"));
});

const getCartItems = asyncHandler(async (req: AuthRequest, res: Response) => {

  const cart = await prisma.cart.findUnique({
    where: {
      userId: req.user.id,
    },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!cart) {
    return res.status(200).json(
      new ApiResponse(
        200,
        {},
        "Cart is empty"
      )
    );
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      cart,
      "Cart fetched successfully"
    )
  );
}
);

const updateCart = asyncHandler(async (req: AuthRequest, res: Response) => {

  const itemId = String(req.params.itemId);
  const { quantity } = req.body;

  if (!quantity || quantity < 1) {
    throw new ApiError(400, "Quantity must be at least 1");
  }


  const cart = await prisma.cart.findUnique({
    where: { userId: req.user.id }
  })

  if (!cart) {
    throw new ApiError(404, "Cart not found");
  }


  const cartItem = await prisma.cartItem.findFirst({
    where: {
      id: itemId,
      cartId: cart.id
    },
    include: {
      product: {
        include: {
          inventory: true
        }
      }
    }
  })

  if (!cartItem) {
    throw new ApiError(404, "CartItem not found");
  }

  if (!cartItem.product.inventory) {
    throw new ApiError(404, "Inventory not found for this product")
  }

  const availableStock = cartItem.product.inventory.quantity - cartItem.product.inventory.reserved;

  if (availableStock < quantity) {
    throw new ApiError(400, "Insufficient Stock")
  }

  const updateItem = await prisma.cartItem.update({
    where: {
      id: cartItem.id
    },
    data: {
      quantity,
    }
  })


  return res
    .status(200)
    .json(
      new ApiResponse(200, updateItem, "Cart Updated Successfully")
    )

})

const removeFromCart = asyncHandler(async (req: AuthRequest, res: Response) => {

  const itemId = String(req.params.itemId)

  const cart = await prisma.cart.findUnique({
    where: { userId: req.user.id }
  })

  if (!cart) {
    throw new ApiError(404, "Cart not found")
  }

  const cartItem = await prisma.cartItem.findFirst({
    where: {
      id: itemId,
      cartId: cart.id
    },

  })

  if (!cartItem){
    throw new ApiError(404, "Cart Item not found")
  }

  await prisma.cartItem.delete({
    where: {id: itemId}
  })

  return res
  .status(200)
  .json(
    new ApiResponse(200, {}, "Item removed from cart Successfully")
  )

})

const clearCart = asyncHandler( async (req: AuthRequest, res: Response) => {

    const cart = await prisma.cart.findUnique({
      where: { userId: req.user.id}
    })

    if (!cart) {
      throw new ApiError(404, "Cart not found")
    }

    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id}
    })

    return res.status(200)
    .json(
      new ApiResponse(200, {}, "Cart Clear Successfully")
    )
})


export {
  addToCart,
  getCartItems,
  updateCart,
  removeFromCart,
  clearCart

}