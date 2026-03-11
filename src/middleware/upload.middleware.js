const multer = require("multer");
const path = require("path");
const AppError = require("../utils/app-error.js");
const { randomUUID } = require("node:crypto");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, "uploads/products"),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError("Only JPEG, PNG, and WebP images are allowed.", 400));
  }
};

const MEGABYTE = 1024 * 1024;

export const uploadProductImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * MEGABYTE },
}).single("image");
