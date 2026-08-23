import type { Request } from "express"
import multer from "multer"

const storage = multer.diskStorage({
    destination: function(req: Request, file: Express.Multer.File,cb: Function){
        cb(null, "./public/temp")
    },
    filename: function(req: Request, file: Express.Multer.File, cb: Function){
        cb(null, file.originalname)
    }
})


export const upload = multer({
    storage,
})