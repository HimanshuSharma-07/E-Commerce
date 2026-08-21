import express, { type NextFunction, type Request, type Response } from "express";
import dotenv from "dotenv";
dotenv.config({
    path: "../.env"
})
import morgan from "morgan";
import { prisma } from "./utils/prismas.js";

const app = express();

const PORT = 5000;

app.use(express.json());
app.use(morgan("dev"));


import userRouter from "./routes/user.route.js"
import { error } from "node:console";



app.use("/api/v1/user", userRouter);


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

