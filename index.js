const express = require("express");
const connectDB = require("./src/configs/db");
const env = require("./src/configs/env");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const path = require("path");
const errorHandler = require("./src/middleware/error.middleware");
const productRoutes = require("./src/routes/product.route");
const authRoutes = require("./src/routes/auth.route");
const MINUTE = 60 * 1000;
const app = express();

async function startServer() {
  try {
    await connectDB();
    app.use(
      cors({
        origin: function (origin, callback) {
          if (!origin || env.allowedOrigins.includes(origin)) {
            return callback(null, true);
          }
          return callback(new Error("CORS Policy: Origin not Allowed"));
        },
        credentials: true,
        methods: ["GET", "POST", "DELETE", "PUT"],
      }),
    );
    app.use(
      "/api",
      rateLimit({
        windowMs: 15 * MINUTE,
        max: 100,
        message: {
          success: false,
          message: "Too many requests. Please try again later.",
        },
      }),
    );
    app.use(express.json({ limit: "10kb" }));
    app.use("/uploads", express.static(path.join(__dirname, "uploads")));
    app.use("/api/v1/products", productRoutes);
    app.use("/api/v1/auth", authRoutes);
    app.use(errorHandler);
    app.listen(env.port, () => {
      console.log(`Server is running on ${env.port}`);
    });
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

startServer();
