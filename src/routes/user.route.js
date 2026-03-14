const express = require("express");
const router = express.Router();
const {
  getProfile,
  updateProfile,
  changePassword,
  getAllUsers,
  toggleUserActive,
} = require("../controllers/user.controller");
const { protect, authorize } = require("../middleware/auth.middleware");

router.get("/me", protect, getProfile);
router.put("/me", protect, updateProfile);
router.post("/me/change-password", protect, changePassword);

router.use(protect, authorize("admin"));
router.get("/", getAllUsers);
router.patch("/:id/toggle", toggleUserActive);

module.exports = router;
