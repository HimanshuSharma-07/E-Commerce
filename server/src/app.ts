import express, { type NextFunction, type Request, type Response } from "express";
import dotenv from "dotenv";
dotenv.config({
    path: "../.env"
})
import morgan from "morgan";
import cookieParser from "cookie-parser";

const app = express();

const PORT = 5000;

app.use(express.json())
app.use(morgan("dev"))
app.use(express.urlencoded({ extended: true, limit: "16kb"}))
app.use(cookieParser())


// Routes imports
import userRouter from "./routes/user.route.js"
import productRouter from "./routes/product.route.js"
import cartRouter from  "./routes/cart.route.js"
import orderRouter from "./routes/order.route.js"
import addressRouter from "./routes/address.route.js" 
import paymentRouter from "./routes/payment.route.js"


// Routes Declaration
app.use("/api/v1/user", userRouter);
app.use("/api/v1/product", productRouter)
app.use("/api/v1/cart", cartRouter)
app.use("/api/v1/order", orderRouter)
app.use("/api/v1/address", addressRouter)
app.use("/api/v1/payment", paymentRouter)


app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err.stack) console.log(err.stack);

    const statusCode = typeof err.statusCode === "number" ? err.statusCode : 500;
    const message = err.message || "Something went wrong";
    
    res.status(statusCode).json({
        success: false,
        message,
        error: String(err)
    });
});

app.listen(PORT, () => {
    console.log(`Server is working at ${PORT}`);
})

