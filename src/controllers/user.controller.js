const asyncHandler = require("../utils/async-handler");
const User = require("../models/user.model");
const AppError = require("../utils/app-error");
const logger = require("../utils/logger");

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password").lean();

  if (!user) throw new AppError("User not found", 404);

  res.status(200).json({
    success: true,
    message: "Profile fetched",
    data: user,
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const { fullName, email, phone, address } = req.body;

  const update = {};

  if (fullName?.trim()) update.fullName = fullName.trim();
  if (email?.trim()) update.email = email.trim().toLowerCase();
  if (phone?.trim()) update.phone = phone.trim();
  if (address?.trim()) update.address = address.trim();

  if (!Object.keys(update).length) {
    throw new AppError("No valid fields provided to update", 400);
  }

  const user = await User.findByIdAndUpdate(req.user._id, update, {
    new: true,
    runValidators: true,
  })
    .select("-password")
    .lean();

  if (!user) throw new AppError("User not found", 404);

  logger.info("Profile updated", {
    userId: req.user._id,
    updatedFields: Object.keys(update),
  });

  res.status(200).json({
    success: true,
    message: "Profile updated",
    data: user,
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select("+password");

  const isCorrect = user && (await user.comparePassword(currentPassword));
  if (!user || !isCorrect) throw new AppError("Invalid credentials", 401);

  user.password = newPassword;
  await user.save();

  logger.info("Password changed", { userId: user._id });

  res.status(200).json({
    success: true,
    message: "Password changed successfully",
  });
});

const getAllUsers = asyncHandler(async (req, res) => {
  const pageNum = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limitNum = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const skip = (pageNum - 1) * limitNum;

  const filter = { role: "user" };

  if (req.query.isActive !== undefined) {
    filter.isActive = req.query.isActive === "true";
  }

  if (req.query.search?.trim()) {
    const escaped = escapeRegex(req.query.search.trim());
    filter.$or = [
      { fullName: { $regex: escaped, $options: "i" } },
      { email: { $regex: escaped, $options: "i" } },
      { phone: { $regex: escaped, $options: "i" } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    message: "Users fetched",
    data: users,
    meta: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1,
    },
  });
});

const toggleUserActive = asyncHandler(async (req, res) => {
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, role: "user" },
    [{ $set: { isActive: { $not: "$isActive" } } }],
    { new: true, updatePipeline: true },
  )
    .select("-password")
    .lean();

  if (!user) throw new AppError("User not found", 404);

  logger.info("User active status toggled", {
    userId: user._id,
    isActive: user.isActive,
  });

  res.status(200).json({
    success: true,
    message: user.isActive ? "User activated" : "User deactivated",
    data: user,
  });
});

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  getAllUsers,
  toggleUserActive,
};
