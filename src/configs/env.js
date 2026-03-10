const dotenv = require("dotenv");
dotenv.config();

module.exports = {
  port: Number(process.env.PORT) || 3000,
  mongodbUri: process.env.MONGODB_URI,
  jwtKey: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN,
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(",") || [],
  shippingFee: Number(process.env.SHIPPING_FEE) || 0,
};
