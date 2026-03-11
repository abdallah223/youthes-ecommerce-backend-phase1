const {
  getProducts,
  getProductBySlug,
  getProductsAdmin,
  createProduct,
} = require("../controllers/product.controller");
const uploadProductImage = require("../middleware/upload.middleware");
const express = require("express");
const router = express.Router();

router.get("/", getProducts);
router.get("/admin", getProductsAdmin);
router.get("/:slug", getProductBySlug);
router.post("/admin", uploadProductImage, createProduct);

module.exports = router;
