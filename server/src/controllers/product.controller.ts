import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { prisma } from "../utils/prisma.js";
import { ApiResponse } from "../utils/ApiResponse.js";


const createProduct = asyncHandler(async (req: Request, res: Response) => {

    const {name, description, categoryId} = req.body
    const price = Number(req.body.price)
    const quantity = Number(req.body.quantity)


    if (!name || !description || !categoryId  || !quantity) {
        throw new ApiError(401, "Product's name, description, category and quantity is requried")
    }
    
    

    if (price <= 0) {
        throw new ApiError(401, "Price must be greater than 0 ")
    }

    if (quantity <= 0) {
        throw new ApiError(401, "Quantity must be greater than 0 ")
    }

    const files = req.files  as {
        image: Express.Multer.File[]
    }

    const imageUrlLocalPath = files.image[0]?.path


    if (!imageUrlLocalPath) {
        throw new ApiError(401, "Product image is required")
    }

    const image = await uploadOnCloudinary(imageUrlLocalPath)
    console.log("Image: ", image);

    const product = await prisma.product.create({
        data: {
            name,
            description,
            image: image?.secure_url || "",
            price,
            category: {
                connect:{
                    id: categoryId,
                }
            },

            inventory: {
              create: {
                quantity,
                reserved:0,
              }
            }
        },

        include:{
          inventory: true,
        }
    })

    return res.status(201)
    .json(
        new ApiResponse(201,  product,"Prodcut Created Successfully")
    )
 })

const getProductDetail = asyncHandler(async (req: Request, res: Response) => {

  const productId = req.params.productId as string;
  
  const product = await prisma.product.findUnique({
    where: {
      id: productId
    }
  })

  if (!product) {
    throw new ApiError(404, "Prodcut not found");
  }

  return res.status(200)
    .json(
      new ApiResponse(200, product, "Product Infromation fetched Successfully")
    )
})

const getAllProducts = asyncHandler(async (req: Request, res: Response) => {

  const products = await prisma.product.findMany();

  return res.status(200)
    .json(
      new ApiResponse(200, products, "All Products fetched Successfully")
    )
})

const updateProductDetails = asyncHandler(async (req: Request, res: Response) => {

  const { name, description, price, categoryId } = req.body
  const productId = String(req.params.productId)

  const product = await prisma.product.findUnique({
    where: {
        id:  productId
      }
    })

  if (!product) {
    throw new ApiError(404,"Product not found")
  }

  const updatedProduct = await prisma.product.update({
    where: {
      id: productId
    },
    data: {
      ...(name !== undefined && {name}),
      ...(description !== undefined && {description}),
      ...(price !== undefined && {price}),
      ...(categoryId !== undefined && {categoryId}),
    }
  })

  return res
    .status(200)
    .json(
    new ApiResponse(200, updatedProduct, "Product details updated Successfully")
  )
  
})

const updateProductImage = asyncHandler(async (req: Request, res: Response) => {

  const productId = String(req.params.productId)

  const productImageLocalPath = req.file?.path

  if (!productImageLocalPath) {
      throw new ApiError(400, "Product image is required")
  }
  
  const uploadedImage = await uploadOnCloudinary(productImageLocalPath)

  if (!uploadedImage?.secure_url) {
    throw new ApiError(500, "Failed to upload Product image")
  }

  const product = await prisma.product.findUnique({
    where: { id: productId}
  }) 

  if (!product) {
    throw new ApiError(404,"Product not found")
  }

  const updatedImage = await prisma.product.update({
    where: {
      id: productId
    },
    data: {
      image:uploadedImage.secure_url
    }
  })

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedImage, "Product Image Updated Successfully")
    )
  
})

const deleteProduct = asyncHandler(async (req: Request, res: Response) =>{

  const productId = String(req.params.productId);

  console.log("ProductId", productId);

  const product = await prisma.product.findUnique({
    where: { id: productId}
  })

  console.log("ProductId", productId);

  if (!product) {
    throw new ApiError(404, "Product not Found")
  }

  await prisma.product.delete({
    where: {
      id:  productId
    }
  })

  return res.status(200)
  .json(
    new ApiResponse(200, {}, "Prodcut Deleted Successfully")
  )
  
})




export{
  createProduct,
  getProductDetail,
  getAllProducts,
  updateProductDetails,
  updateProductImage,
  deleteProduct
}
