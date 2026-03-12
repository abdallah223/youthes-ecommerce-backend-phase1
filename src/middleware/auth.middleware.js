const jwt = require("jsonwebtoken");
const User = require("../models/user.model.js");
const AppError = require("../utils/app-error.js");
const env = require("../configs/env.js");

const protect = async (req, _res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) throw new AppError("Not authenticated. Please login.", 401);

    const decoded = jwt.verify(token, env.jwtKey);

    const user = await User.findById(decoded.id).select("-password");
    if (!user) throw new AppError("User no longer exists.", 401);
    if (!user.isActive)
      throw new AppError(
        "Your account has been suspended. Please contact support.",
        403,
      );

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

const authorize = (...roles) => {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action.", 403),
      );
    }
    next();
  };
};

module.exports = { protect, authorize };
