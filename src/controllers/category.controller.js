const asyncHandler = require("../utils/async-handler");
const { Category, Subcategory } = require("../models/category.model");
const Product = require("../models/product.model");
const AppError = require("../utils/app-error");
const generateSlug = require("../utils/helpers.util");
const logger = require("../utils/logger");

const getAllCategories = asyncHandler(async (_req, res) => {
  const categories = await Category.find({ isActive: true }).lean();

  const result = await Promise.all(
    categories.map(async (cat) => ({
      ...cat,
      subcategories: await Subcategory.find({
        category: cat._id,
        isActive: true,
      }).lean(),
    })),
  );

  res.status(200).json({
    success: true,
    message: "Categories fetched",
    data: result,
  });
});

const getAllCategoriesAdmin = asyncHandler(async (_req, res) => {
  const categories = await Category.find().lean();

  const result = await Promise.all(
    categories.map(async (cat) => ({
      ...cat,
      subcategories: await Subcategory.find({ category: cat._id }).lean(),
    })),
  );

  res.status(200).json({
    success: true,
    message: "Categories fetched",
    data: result,
  });
});

const createCategory = asyncHandler(async (req, res) => {
  const { name, isActive = true } = req.body;

  const category = await Category.create({
    name,
    slug: generateSlug(name),
    isActive,
  });

  logger.info("Category created", {
    categoryId: category._id,
    name: category.name,
  });

  res.status(201).json({
    success: true,
    message: "Category created",
    data: category,
  });
});

const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  const update = {};

  if (name?.trim()) {
    update.name = name.trim();
    update.slug = generateSlug(update.name);
  }

  const category = await Category.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true,
  });

  if (!category) throw new AppError("Category not found", 404);

  logger.info("Category updated", {
    categoryId: category._id,
    updatedFields: Object.keys(update),
  });

  res.status(200).json({
    success: true,
    message: "Category updated",
    data: category,
  });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await Category.findById(id);
  if (!category) throw new AppError("Category not found", 404);

  const count = await Product.countDocuments({
    category: id,
    isDeleted: false,
  });

  if (count > 0) {
    throw new AppError(
      `Cannot delete: ${count} active product(s) are using this category.`,
      400,
    );
  }

  await Subcategory.deleteMany({ category: id });
  await category.deleteOne();

  logger.info("Category deleted", { categoryId: id });

  res.status(200).json({
    success: true,
    message: "Category deleted",
  });
});

const createSubcategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, isActive = true } = req.body;

  const category = await Category.findById(id);
  if (!category) throw new AppError("Category not found", 404);

  const subcategory = await Subcategory.create({
    name,
    slug: generateSlug(name),
    category: id,
    isActive,
  });

  logger.info("Subcategory created", {
    subcategoryId: subcategory._id,
    categoryId: id,
  });

  res.status(201).json({
    success: true,
    message: "Subcategory created",
    data: subcategory,
  });
});

const updateSubcategory = asyncHandler(async (req, res) => {
  const { subId } = req.params;
  const { name } = req.body;

  const update = {};

  if (name?.trim()) {
    update.name = name.trim();
    update.slug = generateSlug(update.name);
  }

  const subcategory = await Subcategory.findByIdAndUpdate(subId, update, {
    new: true,
    runValidators: true,
  });

  if (!subcategory) throw new AppError("Subcategory not found", 404);

  logger.info("Subcategory updated", {
    subcategoryId: subId,
    updatedFields: Object.keys(update),
  });

  res.status(200).json({
    success: true,
    message: "Subcategory updated",
    data: subcategory,
  });
});

const deleteSubcategory = asyncHandler(async (req, res) => {
  const { subId } = req.params;

  const subcategory = await Subcategory.findById(subId);
  if (!subcategory) throw new AppError("Subcategory not found", 404);

  const count = await Product.countDocuments({
    subcategory: subId,
    isDeleted: false,
  });

  if (count > 0) {
    throw new AppError(
      `Cannot delete: ${count} active product(s) are using this subcategory.`,
      400,
    );
  }

  await subcategory.deleteOne();

  logger.info("Subcategory deleted", { subcategoryId: subId });

  res.status(200).json({
    success: true,
    message: "Subcategory deleted",
  });
});

module.exports = {
  getAllCategories,
  getAllCategoriesAdmin,
  createCategory,
  updateCategory,
  deleteCategory,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
};
