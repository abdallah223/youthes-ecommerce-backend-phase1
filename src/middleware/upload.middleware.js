const multer = require("multer");
const AppError = require("../utils/app-error.js");

const storage = multer.memoryStorage();
const fileFilter = (_req, file, cb) => {
  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError("Only JPEG, PNG, and WebP images are allowed.", 400));
  }
};

const MEGABYTE = 1024 * 1024;

const uploadProductImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * MEGABYTE },
}).single("image");

module.exports = uploadProductImage;
