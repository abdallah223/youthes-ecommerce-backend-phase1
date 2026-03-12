const jwt = require("jsonwebtoken");
const User = require("../models/user.model.js");
const AppError = require("../utils/app-error.js");
const env = require("../configs/env.js");

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

const register = async (req, res, next) => {
  try {
    console.log(req.body);
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

    res.status(201).json({
      message: "Account created successfully",
      data: {
        user: sanitizeUser(user),
        token,
      },
    });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    //early catch the error before any database procces
    if (!email || !password) {
      throw new AppError("Please provide email and password", 400);
    }
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

    const result = { user: sanitizeUser(user), token };
    res.status(200).json({ message: "Logged in successfully", data: result });
  } catch (err) {
    next(err);
  }
};

const logout = async (_req, res, next) => {
  try {
    res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
};

module.exports = { logout, login, register };
