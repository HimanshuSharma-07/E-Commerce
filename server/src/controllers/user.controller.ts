import bcrypt from "bcrypt";
import type { Request, Response } from "express";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../utils/prismas.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt.js";
import { access } from "node:fs";

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

    const accessToken = generateAccessToken(userId, user.email);
    const refreshToken = generateRefreshToken(userId);

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

const register = asyncHandler(async (req: Request, res: Response) => {
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

  console.log({
    name,
    email,
    hashPassword,
  });
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
      updateAt: true,
      createdAt: true,
    },
  });

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User Registered Successfully"));
});

const login = asyncHandler(async (req: Request, res: Response) => {
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
      updateAt: true,
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

export { 
    register, 
    login
};
