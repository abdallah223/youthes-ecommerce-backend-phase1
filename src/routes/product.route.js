const {
  getProducts,
  getProductBySlug,
  getProductsAdmin,
} = require("../controllers/product.controller");
const express = require("express");
const router = express.Router();

router.get("/", getProducts);
router.get("/admin", getProductsAdmin);
router.get("/:slug", getProductBySlug);

module.exports = router;
