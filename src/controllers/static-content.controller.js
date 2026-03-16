const asyncHandler = require("../utils/async-handler");
const StaticContent = require("../models/static-content.model");
const AppError = require("../utils/app-error");
const logger = require("../utils/logger");

const VALID_PAGE_KEYS = ["about_us", "faq", "contact_us"];

const getPage = asyncHandler(async (req, res) => {
  const { key } = req.params;

  if (!VALID_PAGE_KEYS.includes(key))
    throw new AppError("Invalid page key", 400);

  const page = await StaticContent.findOne({ pageKey: key });
  if (!page) throw new AppError("Page not found", 404);

  res.status(200).json({
    success: true,
    message: "Page content fetched",
    data: page,
  });
});

const updateAboutUs = asyncHandler(async (req, res) => {
  const { title, body } = req.body;

  const data = await StaticContent.findOneAndUpdate(
    { pageKey: "about_us" },
    { content: { title, body } },
    { new: true, upsert: true },
  );

  logger.info("About Us updated");
  res.status(200).json({ success: true, message: "About Us updated", data });
});

const updateFaq = asyncHandler(async (req, res) => {
  const { items } = req.body;

  const data = await StaticContent.findOneAndUpdate(
    { pageKey: "faq" },
    { content: items },
    { new: true, upsert: true },
  );

  logger.info("FAQ updated");
  res.status(200).json({ success: true, message: "FAQ updated", data });
});

const updateContactUs = asyncHandler(async (req, res) => {
  const { phone, email, address, workingHours, socialLinks } = req.body;

  const data = await StaticContent.findOneAndUpdate(
    { pageKey: "contact_us" },
    { content: { phone, email, address, workingHours, socialLinks } },
    { new: true, upsert: true },
  );

  logger.info("Contact Us updated");
  res.status(200).json({ success: true, message: "Contact Us updated", data });
});

module.exports = {
  getPage,
  updateAboutUs,
  updateFaq,
  updateContactUs,
};
