const {
  getProducts,
  getProductBySlug,
  getProductsAdmin,
  createProduct,
  updateProduct,
} = require("../controllers/product.controller");
const uploadProductImage = require("../middleware/upload.middleware");
const express = require("express");
const router = express.Router();

router.get("/", getProducts);
router.get("/admin/all", getProductsAdmin);
router.get("/:slug", getProductBySlug);

router.post("/", uploadProductImage, createProduct);
router.put("/:id", uploadProductImage, updateProduct);

module.exports = router;
