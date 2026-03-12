const express = require("express");
const router = express.Router();

const {
  getProducts,
  getProductBySlug,
  getProductsAdmin,
  createProduct,
  updateProduct,
  softDeleteProduct,
} = require("../controllers/product.controller");
const { authorize, protect } = require("../middleware/auth.middleware");
const uploadProductImage = require("../middleware/upload.middleware");

router.get("/", getProducts);
router.get("/admin/all", protect, authorize("admin"), getProductsAdmin);
router.get("/:slug", getProductBySlug);

router.use(protect, authorize("admin"));

router.post("/", uploadProductImage, createProduct);
router.put("/:id", uploadProductImage, updateProduct);
router.delete("/:id", softDeleteProduct);

module.exports = router;
