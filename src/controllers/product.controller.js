const asyncHandler = require("../utils/async-handler");
const Product = require("../models/product.model");

const SORT_MAP = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  name_asc: { name: 1 },
  name_desc: { name: -1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
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

module.exports = { getProducts };
