import bcrypt from "bcrypt";
import type { Request, Response } from "express";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../utils/prismas.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt.js";
import type { AuthRequest } from "../types/types.js";
import jwt, { type JwtPayload } from "jsonwebtoken";

const generateAcessAndRefreshToken = async (userId: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id);

    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        refreshToken: refreshToken,
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access and refresh token",
    );
  }
};

const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  if ([name, email, password].some((filed) => filed.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existedUser) {
    throw new ApiError(409, "User with email is already existed");
  }

  const hashPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashPassword,
    },
  });

  const createdUser = await prisma.user.findUnique({
    where: {
      id: user.id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      updatedAt: true,
      createdAt: true,
    },
  });

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User Registered Successfully"));
});

const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email) {
    throw new ApiError(400, "email is rerquired");
  }
  if (!password) {
    throw new ApiError(400, "password is rerquired");
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new ApiError(401, "Invalid Email");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid Password");
  }

  const { accessToken, refreshToken } = await generateAcessAndRefreshToken(
    user.id,
  );

  const loggedInUser = await prisma.user.findUnique({
    where: {
      id: user.id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      updatedAt: true,
      createdAt: true,
    },
  });

  const options = {
    httpOnly: true,
    secure: true
  }

  return res
  .status(200)
  .cookie("accessToken", accessToken, options)
  .cookie("refreshToken", refreshToken, options)
  .json(
    new ApiResponse(
        200, {
            loggedInUser, accessToken, refreshToken
        },
        "User Login Successfully"
    )
  )
});

const logoutUser = asyncHandler(async (req: AuthRequest, res: Response) => {
 
  await prisma.user.update({
    where: {
      id: req.user.id
    },
    data: {
      refreshToken: null
    },
    
  }) 
   
  const options = {
    httpOnly: true,
    secure: true
  }

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
      new ApiResponse(200, {}, "User Logged out Successfully")
    )
  
})

const refreshAccessToken = asyncHandler(async (req: AuthRequest, res: Response) =>  {

  const incomingRefreshToken =  req.cookies.refreshToken || req.body.refreshToken

  if (!incomingRefreshToken) {
      throw new ApiError(401, "unauthroized request")
  }

  try {
      const decodeToken = jwt.verify(
        incomingRefreshToken, 
        process.env.REFRESH_TOKEN_SECRET as string
      ) as JwtPayload & {id: string}

      const user = await prisma.user.findUnique({
        where: { id: decodeToken.id } })

        if (!user) {
            throw new  ApiError(401, "Invalid Refresh Token")
        }

        if (incomingRefreshToken !== user.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
        }

        const options = {
          httpOnly:  true,
          secure: true
        }

        const {accessToken, refreshToken} = await generateAcessAndRefreshToken(user.id)

        return res
          .status(200)
          .cookie("accessToken", accessToken, options)
          .cookie("refreshToken", refreshToken,  options)
          .json(
            new ApiResponse(
              200,
              {accessToken, refreshToken},
              "Access token refreshed Successfully"
            )
          )
    
  } catch (error) {
      const message = (error instanceof Error && error.message) ? error.message : "Invalid refresh token"
      throw new ApiError(401, message)
  }
})

const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  
  const users = await prisma.user.findMany();

  return  res.status(200)
  .json(
    new ApiResponse(200, users, "All users")
  )
})

export { 
    registerUser, 
    loginUser,
    logoutUser,
    refreshAccessToken,
    getAllUsers
};
