import { Router } from "express"
import { createProduct, getProductDetail  ,getAllProducts, updateProductDetails, updateProductImage, deleteProduct } from "../controllers/product.controller.js"
import { upload } from "../middlewares/multer.middleware.js"
import { verifyAdmin, verifyJWT } from "../middlewares/auth.middleware.js"


export const router = Router()


router.get("/all-products", getAllProducts)
router.get("/:productId", getProductDetail)


// admin routes
router.post("/create-product",
  // verifyJWT,
  // verifyAdmin, 
    upload.fields([
        {
            name: "image",
            maxCount: 1,
        },
    ])
    ,createProduct)

router.patch("/update-details/:productId",
  // verifyJWT,
  // verifyAdmin,
  updateProductDetails
)

router.patch("/update-image/:productId",
  // verifyJWT,
  // verifyAdmin,
  upload.single("image"),
  updateProductImage
)

router.delete("/delete-product/:productId",
  // verifyJWT,
  // verifyAdmin,
  deleteProduct
);

export default router