const { Category, Subcategory } = require("../models/category.model");
const { Product } = require("../models/product.model");
const { AppError } = require("../utils/app-error");
const { generateSlug } = require("../utils/helpers.util");

const getAllCategories = async (_req, res, next) => {
  try {
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

    res.status(200).json({ message: "Categories fetched", data: result });
  } catch (err) {
    next(err);
  }
};

const getAllCategoriesAdmin = async (_req, res, next) => {
  try {
    const categories = await Category.find().lean();

    const result = await Promise.all(
      categories.map(async (cat) => ({
        ...cat,
        subcategories: await Subcategory.find({
          category: cat._id,
        }).lean(),
      })),
    );
    res.status(200).json({ message: "Categories fetched", data: result });
  } catch (err) {
    next(err);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const { name, isActive = true } = req.body;

    const category = await Category.create({
      name,
      slug: generateSlug(name),
      isActive,
    });
    res.status(201).json({ message: "Category created", data: category });
  } catch (err) {
    next(err);
  }
};

const updateCategory = async (req, res, next) => {
  try {
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

    if (!category) {
      throw new AppError("Category not found", 404);
    }
    res.status(200).json({ message: "Category updated", data: category });
  } catch (err) {
    next(err);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      throw new AppError("Category not found", 404);
    }

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
    res.status(200).json({ message: "Category deleted" });
  } catch (err) {
    next(err);
  }
};

const createSubcategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, isActive = true } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      throw new AppError("Category not found", 404);
    }

    const subcategory = await Subcategory.create({
      name,
      slug: generateSlug(name),
      category: id,
      isActive,
    });
    res.status(201).json({ message: "Subcategory created", data: subcategory });
  } catch (err) {
    next(err);
  }
};

const updateSubcategory = async (req, res, next) => {
  try {
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

    if (!subcategory) {
      throw new AppError("Subcategory not found", 404);
    }
    res.status(200).json({ message: "Subcategory updated", data: subcategory });
  } catch (err) {
    next(err);
  }
};

const deleteSubcategory = async (req, res, next) => {
  try {
    const { subId } = req.params;

    const subcategory = await Subcategory.findById(subId);
    if (!subcategory) {
      throw new AppError("Subcategory not found", 404);
    }

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
    res.status(200).json({ message: "Category created" });
  } catch (err) {
    next(err);
  }
};

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
