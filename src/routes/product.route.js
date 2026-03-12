const {
  getProducts,
  getProductBySlug,
  getProductsAdmin,
  createProduct,
  updateProduct,
  softDeleteProduct,
} = require("../controllers/product.controller");
const uploadProductImage = require("../middleware/upload.middleware");
const express = require("express");
const router = express.Router();

router.get("/", getProducts);
router.get("/admin/all", getProductsAdmin);
router.get("/:slug", getProductBySlug);

router.post("/", uploadProductImage, createProduct);
router.put("/:id", uploadProductImage, updateProduct);
router.delete("/:id", softDeleteProduct);

module.exports = router;
