const mongoose = require("mongoose");
const asyncHandler = require("../utils/async-handler");
const Order = require("../models/order.model");
const Cart = require("../models/cart.model");
const Product = require("../models/product.model");
const AppError = require("../utils/app-error");
const logger = require("../utils/logger");
const generateOrderNumber = require("../utils/helpers.util");
const env = require("../configs/env");

const SHIPPING_FEE = env.shippingFee;

const TERMINAL_STATUSES = [
  "Delivered",
  "CancelledByUser",
  "CancelledByAdmin",
  "Rejected",
];
const STOCK_DEDUCTED = ["Pending", "Prepared", "Shipped", "Delivered"];
const RETURNS_STOCK = ["CancelledByAdmin", "Rejected"];

const VALID_TRANSITIONS = {
  Pending: ["Prepared", "CancelledByAdmin", "Rejected"],
  Prepared: ["Shipped", "CancelledByAdmin", "Rejected"],
  Shipped: ["Delivered", "CancelledByAdmin", "Rejected"],
  Delivered: [],
  CancelledByUser: [],
  CancelledByAdmin: [],
  Rejected: [],
};

//Helpers

const validateObjectId = (id, label = "ID") => {
  if (!mongoose.Types.ObjectId.isValid(id))
    throw new AppError(`Invalid ${label}`, 400);
};

const deductStock = async (order) => {
  const checks = await Promise.all(
    order.items.map(async (item) => {
      const product = await Product.findById(item.productId).select(
        "stockCount name",
      );
      if (!product)
        return {
          ok: false,
          message: `Product "${item.productName}" not found`,
        };
      if (product.stockCount < item.quantity)
        return {
          ok: false,
          message: `Insufficient stock for "${item.productName}". Available: ${product.stockCount}`,
        };
      return { ok: true };
    }),
  );

  const failures = checks.filter((c) => !c.ok);
  if (failures.length > 0)
    throw new AppError(
      "Cannot prepare order: insufficient stock.",
      400,
      failures.map((f) => ({ field: "stock", message: f.message })),
    );

  await Promise.all(
    order.items.map((item) =>
      Product.findByIdAndUpdate(item.productId, {
        $inc: { stockCount: -item.quantity },
      }),
    ),
  );
};

const returnStock = async (order) => {
  await Promise.all(
    order.items.map((item) =>
      Product.findByIdAndUpdate(item.productId, {
        $inc: { stockCount: item.quantity },
      }),
    ),
  );
};

//Controllers

const createOrder = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  const { deliveryPhone, deliveryAddress } = req.body;

  const cart = await Cart.findOne({ user: userId });
  if (!cart || cart.items.length === 0)
    throw new AppError(
      "Your cart is empty. Add items before placing an order.",
      400,
    );

  const products = await Product.find({
    _id: { $in: cart.items.map((i) => i.product) },
    isDeleted: false,
  });

  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  const stockErrors = [];
  for (const item of cart.items) {
    const product = productMap.get(item.product.toString());
    if (!product)
      stockErrors.push({
        field: item.product.toString(),
        message: "A product in your cart is no longer available.",
      });
    else if (product.stockCount === 0)
      stockErrors.push({
        field: product.name,
        message: `"${product.name}" is out of stock.`,
      });
    else if (item.quantity > product.stockCount)
      stockErrors.push({
        field: product.name,
        message: `Not enough stock available for "${product.name}".`,
      });
  }

  if (stockErrors.length > 0)
    throw new AppError(
      "Some items are unavailable or out of stock.",
      400,
      stockErrors,
    );

  const orderItems = cart.items.map((item) => {
    const product = productMap.get(item.product.toString());
    return {
      productId: product._id,
      productName: product.name,
      productImage: product.image,
      unitPrice: product.price,
      quantity: item.quantity,
      subtotal: product.price * item.quantity,
    };
  });

  const itemsTotal = orderItems.reduce((sum, i) => sum + i.subtotal, 0);

  const order = await Order.create({
    orderNumber: await generateOrderNumber(),
    user: userId,
    items: orderItems,
    deliveryPhone,
    deliveryAddress,
    shippingFee: SHIPPING_FEE,
    totalAmount: itemsTotal + SHIPPING_FEE,
    paymentMethod: "COD",
    status: "Pending",
  });

  await deductStock(order);

  await Cart.findOneAndUpdate({ user: userId }, { $set: { items: [] } });

  logger.info("Order created", {
    orderId: order._id,
    userId,
    total: order.totalAmount,
  });

  res.status(201).json({
    success: true,
    message: "Order placed successfully",
    data: order,
  });
});

const getMyOrders = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Order.countDocuments({ user: userId }),
  ]);

  res.status(200).json({
    success: true,
    message: "Orders fetched",
    data: orders,
    meta: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

const getMyOrderById = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();

  validateObjectId(req.params.id, "order ID");

  const order = await Order.findOne({ _id: req.params.id, user: userId });
  if (!order) throw new AppError("Order not found", 404);

  res.status(200).json({
    success: true,
    message: "Order fetched",
    data: order,
  });
});

const cancelMyOrder = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  const { reason } = req.body;

  validateObjectId(req.params.id, "order ID");

  const order = await Order.findOne({ _id: req.params.id, user: userId });
  if (!order) throw new AppError("Order not found", 404);
  if (order.status !== "Pending")
    throw new AppError(
      `This order cannot be cancelled. It is already "${order.status}".`,
      400,
    );

  order.status = "CancelledByUser";
  order.cancelledBy = "user";
  if (reason) order.cancellationReason = reason;

  await returnStock(order);

  await order.save();

  logger.info("Order cancelled by user", { orderId: order._id, userId });

  res.status(200).json({
    success: true,
    message: "Order cancelled",
    data: order,
  });
});

const getOrdersAdmin = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.userId) filter.user = req.query.userId;
  if (req.query.search)
    filter.orderNumber = { $regex: req.query.search, $options: "i" };
  if (req.query.dateFrom || req.query.dateTo) {
    filter.createdAt = {};
    if (req.query.dateFrom)
      filter.createdAt.$gte = new Date(req.query.dateFrom);
    if (req.query.dateTo) filter.createdAt.$lte = new Date(req.query.dateTo);
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "fullName email phone")
      .lean(),
    Order.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    message: "Orders fetched",
    data: orders,
    meta: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

const getOrderByIdAdmin = asyncHandler(async (req, res) => {
  validateObjectId(req.params.id, "order ID");

  const order = await Order.findById(req.params.id).populate(
    "user",
    "fullName email phone",
  );
  if (!order) throw new AppError("Order not found", 404);

  res.status(200).json({
    success: true,
    message: "Order fetched",
    data: order,
  });
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;

  validateObjectId(req.params.id, "order ID");

  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError("Order not found", 404);

  if (TERMINAL_STATUSES.includes(order.status))
    throw new AppError(
      `This order is already "${order.status}" and cannot be changed.`,
      400,
    );

  if (!VALID_TRANSITIONS[order.status].includes(status))
    throw new AppError(
      `Cannot move order from "${order.status}" to "${status}".`,
      400,
    );

  const prevStatus = order.status;

  if (STOCK_DEDUCTED.includes(prevStatus) && RETURNS_STOCK.includes(status))
    await returnStock(order);

  order.status = status;

  if (status === "CancelledByAdmin") {
    order.cancelledBy = "admin";
    if (note) order.cancellationReason = note;
  }

  if (status === "Rejected" && note) order.cancellationReason = note;

  await order.save();

  logger.info("Order status updated", {
    orderId: order._id,
    from: prevStatus,
    to: status,
  });

  res.status(200).json({
    success: true,
    message: `Order status updated to "${order.status}"`,
    data: order,
  });
});

const getSalesReport = asyncHandler(async (req, res) => {
  const dateFrom = req.query.dateFrom
    ? new Date(req.query.dateFrom)
    : new Date(new Date().setDate(1));

  const dateTo = req.query.dateTo
    ? new Date(new Date(req.query.dateTo).setHours(23, 59, 59, 999))
    : new Date();

  if (isNaN(dateFrom) || isNaN(dateTo))
    throw new AppError("Invalid date format. Use YYYY-MM-DD", 400);
  if (dateFrom > dateTo)
    throw new AppError("dateFrom cannot be after dateTo", 400);

  const match = {
    status: "Delivered",
    createdAt: { $gte: dateFrom, $lte: dateTo },
  };

  const [summary, topProducts] = await Promise.all([
    Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
          totalOrders: { $count: {} },
          averageOrderValue: { $avg: "$totalAmount" },
        },
      },
    ]),
    Order.aggregate([
      { $match: match },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          productName: { $first: "$items.productName" },
          totalSold: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.subtotal" },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
    ]),
  ]);

  logger.info("Sales report generated", { dateFrom, dateTo });

  res.status(200).json({
    success: true,
    message: "Sales report generated",
    data: {
      period: { from: dateFrom, to: dateTo },
      summary: summary[0] || {
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0,
      },
      topProducts,
    },
  });
});

const getNotifications = asyncHandler(async (_req, res) => {
  const [newOrders, outOfStock] = await Promise.all([
    Order.countDocuments({ status: "Pending" }),
    Product.countDocuments({ stockCount: 0, isDeleted: false }),
  ]);

  res.status(200).json({
    success: true,
    message: "Notification counts fetched",
    data: { newOrders, outOfStock },
  });
});

module.exports = {
  createOrder,
  getMyOrders,
  getMyOrderById,
  cancelMyOrder,
  getOrdersAdmin,
  getOrderByIdAdmin,
  updateOrderStatus,
  getSalesReport,
  getNotifications,
};
