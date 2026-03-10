const AppError = require("../utils/app-error.js");
const logger = require("../utils/logger.js");

const errorHandler = (err, req, res, _next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: "A record with the provided information already exists.",
    });
  }

  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Invalid request data.",
    });
  }

  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid authentication credentials.",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Your session has expired. Please sign in again.",
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message || "The request could not be completed.",
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal server error.",
  });
};

module.exports = errorHandler;
