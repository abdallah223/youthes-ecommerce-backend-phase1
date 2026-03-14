const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const AppError = require("../utils/app-error");
const asyncHandler = require("../utils/async-handler");
const logger = require("../utils/logger");
const env = require("../configs/env");

const signToken = (userId) =>
  jwt.sign({ id: userId }, env.jwtKey, { expiresIn: env.jwtExpiresIn });

const sanitizeUser = (user) => ({
  _id: user._id,
  fullName: user.fullName,
  email: user.email,
  phone: user.phone,
  gender: user.gender,
  address: user.address,
  role: user.role,
});

const register = asyncHandler(async (req, res) => {
  const { fullName, email, password, phone, gender, address } = req.body;

  const user = await User.create({
    fullName,
    email,
    password,
    phone,
    gender,
    address,
  });

  const token = signToken(user._id.toString());

  logger.info("User registered", { userId: user._id, email: user.email });

  res.status(201).json({
    success: true,
    message: "Account created successfully",
    data: { user: sanitizeUser(user), token },
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    throw new AppError("Please provide email and password", 400);

  const user = await User.findOne({ email: email.toLowerCase() }).select(
    "+password",
  );

  if (!user) throw new AppError("Invalid credentials", 401);

  if (!user.isActive)
    throw new AppError(
      "Your account has been suspended. Please contact support.",
      403,
    );

  const isCorrect = await user.comparePassword(password);
  if (!isCorrect) throw new AppError("Invalid credentials", 401);

  const token = signToken(user._id.toString());

  logger.info("User logged in", { userId: user._id, email: user.email });

  res.status(200).json({
    success: true,
    message: "Logged in successfully",
    data: { user: sanitizeUser(user), token },
  });
});

const logout = asyncHandler(async (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

module.exports = { register, login, logout };
