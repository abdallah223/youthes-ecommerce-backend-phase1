const asyncHandler = require("../utils/async-handler");
const Testimonial = require("../models/testimonial.model");
const AppError = require("../utils/app-error");
const logger = require("../utils/logger");

const getApprovedTestimonials = asyncHandler(async (_req, res) => {
  const data = await Testimonial.find({ status: "approved" })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  res.status(200).json({
    success: true,
    message: "Testimonials fetched",
    data,
  });
});

const createTestimonial = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  const { reviewText, rating } = req.body;

  const existing = await Testimonial.findOne({ user: userId });
  if (existing)
    throw new AppError("You have already submitted a testimonial.", 400);

  const testimonial = await Testimonial.create({
    user: userId,
    userName: req.user.fullName,
    reviewText,
    rating,
    status: "pending",
  });

  logger.info("Testimonial submitted", {
    userId,
    testimonialId: testimonial._id,
  });

  res.status(201).json({
    success: true,
    message: "Testimonial submitted. It will appear after review.",
    data: testimonial,
  });
});

const getTestimonialsAdmin = asyncHandler(async (req, res) => {
  const { status, page: rawPage, limit: rawLimit } = req.query;
  const page = parseInt(rawPage) || 1;
  const limit = parseInt(rawLimit) || 20;
  const skip = (page - 1) * limit;

  const filter = status ? { status } : {};

  const [testimonials, total] = await Promise.all([
    Testimonial.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "fullName email")
      .lean(),
    Testimonial.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    message: "Testimonials fetched",
    data: testimonials,
    meta: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

const updateTestimonialStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const testimonial = await Testimonial.findByIdAndUpdate(
    id,
    { status },
    { new: true },
  );

  if (!testimonial) throw new AppError("Testimonial not found", 404);

  logger.info("Testimonial status updated", {
    testimonialId: testimonial._id,
    status,
  });

  res.status(200).json({
    success: true,
    message: `Testimonial ${status}`,
    data: testimonial,
  });
});

module.exports = {
  getApprovedTestimonials,
  createTestimonial,
  getTestimonialsAdmin,
  updateTestimonialStatus,
};
