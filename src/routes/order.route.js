const { Router } = require("express");
const { protect, authorize } = require("../middleware/auth.middleware");

const {
  createOrder,
  getMyOrders,
  getMyOrderById,
  cancelMyOrder,
  getOrdersAdmin,
  getOrderByIdAdmin,
  updateOrderStatus,
  getSalesReport,
  getNotifications,
} = require("../controllers/order.controller");

const router = Router();

router.use(protect);

router.post("/", authorize("user", "admin"), createOrder);
router.get("/my", getMyOrders);
router.get("/my/:id", getMyOrderById);
router.patch("/my/:id/cancel", cancelMyOrder);

router.use(authorize("admin"));

router.get("/admin", protect, getOrdersAdmin);
router.get("/admin/reports/sales", getSalesReport);
router.get("/admin/notifications", getNotifications);
router.get("/admin/:id", getOrderByIdAdmin);
router.patch("/admin/:id/status", updateOrderStatus);

module.exports = router;
