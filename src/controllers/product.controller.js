// Dear Dr. Ahmed,
// I've enforced strict validation here as a learning exercise,
// but I kept it looser in other controllers  and did not seperate controller logic
//and i did into service to simplify your review process besides .

const asyncHandler = require("../utils/async-handler");
const Product = require("../models/product.model");
const { Category, Subcategory } = require("../models/category.model");
const generateSlug = require("../utils/helpers.util");
const AppError = require("../utils/app-error");
const fs = require("fs");
const path = require("path");
const { log } = require("winston");

const SORT_MAP = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  name_asc: { name: 1 },
  name_desc: { name: -1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
};

const validateExistance = async (
  model,
  filter,
  message = "there is no match data",
) => {
  const isExists = await model.exists(filter);
  if (!isExists) {
    throw new AppError(message, 400);
  }
};

const getProducts = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    category,
    subcategory,
    search,
    sort,
  } = req.query;

  const skip = (page - 1) * limit;
  const filter = { isDeleted: false };

  if (category) filter.category = category;
  if (subcategory) filter.subcategory = subcategory;
  if (search?.trim()) filter.$text = { $search: search.trim() };

  const sortOrder = SORT_MAP[sort] || SORT_MAP.newest;

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort(sortOrder)
      .skip(skip)
      .limit(Number(limit))
      .populate("category", "name slug")
      .populate("subcategory", "name slug")
      .lean(),
    Product.countDocuments(filter),
  ]);
  res.status(200).json({
    success: true,
    products,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

const getProductBySlug = asyncHandler(async (req, res) => {
  const slug = req.params.slug;
  console.log(slug);
  const product = await Product.findOne({ slug, isDeleted: false })
    .populate("category", "name slug")
    .populate("subcategory", "name slug");
  if (!product) throw new AppError("Product not found", 404);
  res.status(200).json({ data: product, message: "Product fetched" });
});

const getProductsAdmin = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, category, search } = req.query;

  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;

  const filter = {};
  if (category) filter.category = category;
  if (search?.trim()) filter.$text = { $search: search.trim() };

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate("category", "name")
      .populate("subcategory", "name")
      .lean(),
    Product.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    products,
    meta: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
});

const createProduct = asyncHandler(async (req, res) => {
  const { name, description, price, category, subcategory, stockCount } =
    req.body;
  if (!req.file) throw new AppError("Product image is required", 400);
  await validateExistance(Category, { _id: category }, "Category not found");
  if (subcategory)
    await validateExistance(
      Subcategory,
      { _id: subcategory, category },
      "Subcategory not found or does not belong to category",
    );
  const created = await Product.create({
    name,
    slug: generateSlug(name),
    description,
    price,
    category,
    subcategory: subcategory || undefined,
    stockCount: stockCount ?? 0,
    image: req.file.filename,
  });

  res.status(201).json({
    message: "Product created",
    data: created,
  });
});

const updateProduct = asyncHandler(async (req, res) => {
  const { name, description, price, category, subcategory, stockCount } =
    req.body;

  const data = {
    ...(name?.trim() && { name }),
    ...(description?.trim() && { description }),
    ...(price != null && { price }),
    ...(category && { category }),
    ...(stockCount != null && { stockCount }),
  };

  if (req.file) data.image = req.file.filename;

  const product = await Product.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!product) throw new AppError("Product not found", 404);

  if (data.name) data.slug = generateSlug(data.name);

  if (data.category) {
    await validateExistance(
      Category,
      { _id: data.category },
      "Category not found",
    );
  }

  if (subcategory === null || subcategory === "") {
    product.subcategory = undefined;
  } else if (subcategory) {
    await validateExistance(
      Subcategory,
      { _id: subcategory, category: data.category || product.category },
      "Subcategory not found or does not belong to category",
    );
    data.subcategory = subcategory;
  }

  const oldImage = product.image;

  Object.assign(product, data);
  await product.save();

  if (data.image && oldImage) deleteImageFromDisk(oldImage);

  res.status(200).json({
    message: "Product updated",
    data: product,
  });
});

const deleteImageFromDisk = (filename) => {
  if (!filename) return;
  const filepath = path.join(process.cwd(), "uploads", "products", filename);
  fs.unlink(filepath, (err) => {
    if (err && err.code !== "ENOENT")
      console.error("Failed to delete image:", err.message);
  });
};

module.exports = {
  getProducts,
  getProductBySlug,
  getProductsAdmin,
  createProduct,
  updateProduct,
};
