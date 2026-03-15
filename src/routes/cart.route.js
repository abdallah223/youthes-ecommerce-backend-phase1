const { Router } = require("express");
const router = Router();
const { protect } = require("../middleware/auth.middleware");
const {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  mergeCart,
  confirmPriceChange,
} = require("../controllers/cart.controller");

router.use(protect);

router.get("/", getCart);
router.post("/items", addItem);
router.put("/items/:productId", updateItem);
router.delete("/items/:productId", removeItem);
router.delete("/", clearCart);
router.post("/merge", mergeCart);
router.patch("/confirm-price/:productId", confirmPriceChange);

module.exports = router;
