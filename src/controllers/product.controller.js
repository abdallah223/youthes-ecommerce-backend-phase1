const asyncHandler = require("../utils/async-handler");
const Product = require("../models/product.model");
const { Category, Subcategory } = require("../models/category.model");
const generateSlug = require("../utils/helpers.util");
const AppError = require("../utils/app-error");
const logger = require("../utils/logger");
const imagekit = require("../configs/imagekit");

const SORT_MAP = {
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  price_asc: { price: 1, _id: 1 },
  price_desc: { price: -1, _id: -1 },
  name_asc: { name: 1, _id: 1 },
  name_desc: { name: -1, _id: -1 },
};

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const buildSearchFilter = (search) => {
  const words = search.trim().split(/\s+/).filter(Boolean);

  if (words.length === 1) {
    const regex = { $regex: escapeRegex(words[0]), $options: "i" };
    return {
      $or: [{ name: regex }, { description: regex }],
    };
  }
  return {
    $and: words.map((word) => ({
      $or: [
        { name: { $regex: escapeRegex(word), $options: "i" } },
        { description: { $regex: escapeRegex(word), $options: "i" } },
      ],
    })),
  };
};

const validateExistence = async (
  model,
  filter,
  message = "No matching data found",
) => {
  const exists = await model.exists(filter);
  if (!exists) throw new AppError(message, 404);
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

  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;

  const filter = { isDeleted: false };
  if (category) filter.category = category;
  if (subcategory) filter.subcategory = subcategory;
  if (search?.trim()) Object.assign(filter, buildSearchFilter(search));

  const sortOrder = SORT_MAP[sort] || SORT_MAP.newest;

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort(sortOrder)
      .skip(skip)
      .limit(limitNum)
      .populate("category", "name slug")
      .populate("subcategory", "name slug")
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

const getProductBySlug = asyncHandler(async (req, res) => {
  const product = await Product.findOne({
    slug: req.params.slug,
    isDeleted: false,
  })
    .populate("category", "name slug")
    .populate("subcategory", "name slug")
    .lean();

  if (!product) throw new AppError("Product not found", 404);

  res.status(200).json({
    success: true,
    message: "Product fetched",
    data: product,
  });
});

const getProductsAdmin = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, category, search } = req.query;

  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;

  const filter = {};
  if (category) filter.category = category;
  if (search?.trim()) Object.assign(filter, buildSearchFilter(search));

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort({ createdAt: -1, _id: -1 })
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

  await validateExistence(Category, { _id: category }, "Category not found");

  if (subcategory) {
    await validateExistence(
      Subcategory,
      { _id: subcategory, category },
      "Subcategory not found or does not belong to category",
    );
  }
  const uploadResult = await imagekit.upload({
    file: req.file.buffer,
    fileName: req.file.originalname,
    folder: "products",
  });
  const created = await Product.create({
    name,
    slug: generateSlug(name),
    description,
    price,
    category,
    subcategory: subcategory || undefined,
    stockCount: stockCount ?? 0,
    image: uploadResult.url,
  });

  logger.info("Product created", {
    productId: created._id,
    name: created.name,
    category: created.category,
  });

  res.status(201).json({
    success: true,
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

  if (req.file) {
    const uploadResult = await imagekit.upload({
      file: req.file.buffer,
      fileName: req.file.originalname,
      folder: "products",
    });

    data.image = uploadResult.url;
  }

  const product = await Product.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!product) throw new AppError("Product not found", 404);

  if (data.name && data.name !== product.name) {
    data.slug = generateSlug(data.name);
  }

  if (data.category) {
    await validateExistence(
      Category,
      { _id: data.category },
      "Category not found",
    );
  }

  if (subcategory === null || subcategory === "") {
    product.subcategory = undefined;
  } else if (subcategory) {
    await validateExistence(
      Subcategory,
      { _id: subcategory, category: data.category || product.category },
      "Subcategory not found or does not belong to category",
    );
    data.subcategory = subcategory;
  }

  Object.assign(product, data);
  await product.save();

  logger.info("Product updated", {
    productId: product._id,
    updatedFields: Object.keys(data),
  });

  res.status(200).json({
    success: true,
    message: "Product updated",
    data: product,
  });
});

const softDeleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!product) throw new AppError("Product not found", 404);

  product.isDeleted = true;
  await product.save();

  logger.info("Product soft deleted", {
    productId: product._id,
    name: product.name,
  });

  res.status(200).json({
    success: true,
    message: "Product deleted",
  });
});

module.exports = {
  getProducts,
  getProductBySlug,
  getProductsAdmin,
  createProduct,
  updateProduct,
  softDeleteProduct,
};
