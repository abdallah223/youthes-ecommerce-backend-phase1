const mongoose = require("mongoose");
const asyncHandler = require("../utils/async-handler");
const Cart = require("../models/cart.model");
const Product = require("../models/product.model");
const AppError = require("../utils/app-error");
const logger = require("../utils/logger");
const env = require("../configs/env");

const SHIPPING_FEE = env.shippingFee;

const EMPTY_CART = (shippingFee) => ({
  items: [],
  itemCount: 0,
  subtotal: 0,
  shippingFee,
  total: shippingFee,
  hasPriceChanges: false,
});

const validateProduct = async (productId, requestedQuantity) => {
  if (!mongoose.Types.ObjectId.isValid(productId))
    throw new AppError("Invalid product ID", 400);

  const product = await Product.findOne({ _id: productId, isDeleted: false });

  if (!product)
    throw new AppError("Product not found or no longer available", 404);
  if (product.stockCount === 0)
    throw new AppError("This product is out of stock", 400);
  if (requestedQuantity > product.stockCount)
    throw new AppError(`Not enough stock available for "${product.name}"`, 400);

  return product;
};

const buildProductMap = async (cartItems) => {
  const products = await Product.find({
    _id: { $in: cartItems.map((i) => i.product) },
    isDeleted: false,
  }).lean();

  return new Map(products.map((p) => [p._id.toString(), p]));
};

const enrichCartItems = (cartItems, productMap) => {
  const enriched = [];
  const invalidIds = new Set();

  for (const item of cartItems) {
    const product = productMap.get(item.product.toString());

    if (!product) {
      invalidIds.add(item.product.toString());
      continue;
    }

    enriched.push({
      product: {
        _id: product._id.toString(),
        name: product.name,
        image: product.image,
        price: product.price,
        stockCount: product.stockCount,
      },
      quantity: item.quantity,
      priceAtAdd: item.priceAtAdd,
      priceChanged: item.priceAtAdd !== product.price,
      currentPrice: product.price,
      subtotal: product.price * item.quantity,
    });
  }

  return { enriched, invalidIds };
};

const removeStaleItems = async (cart, invalidIds) => {
  cart.items = cart.items.filter(
    (item) => !invalidIds.has(item.product.toString()),
  );
  await cart.save();
};

const buildCartSummary = (enrichedItems, shippingFee) => {
  const subtotal = enrichedItems.reduce((sum, i) => sum + i.subtotal, 0);

  return {
    items: enrichedItems,
    itemCount: enrichedItems.reduce((sum, i) => sum + i.quantity, 0),
    subtotal,
    shippingFee,
    total: subtotal + shippingFee,
    hasPriceChanges: enrichedItems.some((i) => i.priceChanged),
  };
};

const getEnrichedCart = async (userId, shippingFee) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart || cart.items.length === 0) return EMPTY_CART(shippingFee);

  const productMap = await buildProductMap(cart.items);
  const { enriched, invalidIds } = enrichCartItems(cart.items, productMap);

  if (invalidIds.size > 0) await removeStaleItems(cart, invalidIds);

  return buildCartSummary(enriched, shippingFee);
};

const getCart = asyncHandler(async (req, res) => {
  const data = await getEnrichedCart(req.user._id.toString(), SHIPPING_FEE);

  res.status(200).json({
    success: true,
    message: "Cart fetched",
    data,
  });
});

const addItem = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;
  const userId = req.user._id.toString();

  const product = await validateProduct(productId, quantity);
  let cart = await Cart.findOne({ user: userId });

  if (!cart) {
    cart = await Cart.create({
      user: userId,
      items: [{ product: productId, quantity, priceAtAdd: product.price }],
    });
  } else {
    const index = cart.items.findIndex(
      (i) => i.product.toString() === productId,
    );

    if (index >= 0) {
      const newQuantity = cart.items[index].quantity + quantity;
      if (newQuantity > product.stockCount)
        throw new AppError(
          "Cannot add that quantity. Not enough stock available.",
          400,
        );
      cart.items[index].quantity = newQuantity;
      cart.items[index].priceAtAdd = product.price;
    } else {
      cart.items.push({
        product: new mongoose.Types.ObjectId(productId),
        quantity,
        priceAtAdd: product.price,
      });
    }
    await cart.save();
  }

  logger.info("Item added to cart", { userId, productId, quantity });

  const data = await getEnrichedCart(userId, SHIPPING_FEE);

  res.status(201).json({
    success: true,
    message: "Item added to cart",
    data,
  });
});

const updateItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body;
  const userId = req.user._id.toString();

  const product = await validateProduct(productId, quantity);
  const cart = await Cart.findOne({ user: userId });

  if (!cart) throw new AppError("Cart not found", 404);

  const index = cart.items.findIndex((i) => i.product.toString() === productId);
  if (index === -1) throw new AppError("Item not found in cart", 404);

  cart.items[index].quantity = quantity;
  cart.items[index].priceAtAdd = product.price;
  await cart.save();

  logger.info("Cart item updated", { userId, productId, quantity });

  const data = await getEnrichedCart(userId, SHIPPING_FEE);

  res.status(200).json({
    success: true,
    message: "Cart updated",
    data,
  });
});

const removeItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const userId = req.user._id.toString();

  const cart = await Cart.findOne({ user: userId });
  if (!cart) throw new AppError("Cart not found", 404);

  const before = cart.items.length;
  cart.items = cart.items.filter((i) => i.product.toString() !== productId);
  if (cart.items.length === before)
    throw new AppError("Item not found in cart", 404);

  await cart.save();

  logger.info("Cart item removed", { userId, productId });

  const data = await getEnrichedCart(userId, SHIPPING_FEE);

  res.status(200).json({
    success: true,
    message: "Item removed from cart",
    data,
  });
});

const clearCart = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();

  await Cart.findOneAndUpdate({ user: userId }, { $set: { items: [] } });

  logger.info("Cart cleared", { userId });

  res.status(200).json({
    success: true,
    message: "Cart cleared",
  });
});

const mergeCart = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  const guestItems = req.body.items;

  if (!Array.isArray(guestItems))
    throw new AppError("items must be an array", 400);

  if (!guestItems.length) {
    const data = await getEnrichedCart(userId, SHIPPING_FEE);
    return res.status(200).json({
      success: true,
      message: "Cart merged",
      data,
    });
  }

  if (
    guestItems.some(
      (item) =>
        !item.productId ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1,
    )
  )
    throw new AppError(
      "Each item must have a valid productId and a positive quantity",
      400,
    );

  const products = await Product.find({
    _id: { $in: guestItems.map((item) => item.productId) },
    isDeleted: false,
    stockCount: { $gt: 0 },
  }).lean();

  const productMap = new Map(
    products.map((product) => [product._id.toString(), product]),
  );

  let cart = await Cart.findOne({ user: userId });
  if (!cart) cart = new Cart({ user: userId, items: [] });

  const cartItemMap = new Map(
    cart.items.map((item) => [item.product.toString(), item]),
  );

  for (const guestItem of guestItems) {
    const product = productMap.get(guestItem.productId);
    if (!product) continue;

    const existingItem = cartItemMap.get(guestItem.productId);

    if (existingItem) {
      existingItem.quantity = Math.min(
        Math.max(existingItem.quantity, guestItem.quantity),
        product.stockCount,
      );
      existingItem.priceAtAdd = product.price;
      continue;
    }

    const newItem = {
      product: new mongoose.Types.ObjectId(guestItem.productId),
      quantity: Math.min(guestItem.quantity, product.stockCount),
      priceAtAdd: product.price,
    };

    cart.items.push(newItem);
    cartItemMap.set(guestItem.productId, newItem);
  }

  await cart.save();

  logger.info("Guest cart merged", {
    userId,
    guestItemCount: guestItems.length,
  });

  const data = await getEnrichedCart(userId, SHIPPING_FEE);

  res.status(200).json({
    success: true,
    message: "Cart merged",
    data,
  });
});

const confirmPriceChange = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  const productId = req.params.productId || "all";

  const cart = await Cart.findOne({ user: userId });
  if (!cart) throw new AppError("Cart not found", 404);

  if (productId === "all") {
    const products = await Product.find({
      _id: { $in: cart.items.map((i) => i.product) },
    }).lean();

    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    cart.items.forEach((item) => {
      const p = productMap.get(item.product.toString());
      if (p) item.priceAtAdd = p.price;
    });
  } else {
    const product = await Product.findById(productId).lean();
    if (!product) throw new AppError("Product not found", 404);

    const item = cart.items.find((i) => i.product.toString() === productId);
    if (!item) throw new AppError("Item not found in cart", 404);

    item.priceAtAdd = product.price;
  }

  await cart.save();

  logger.info("Price change confirmed", { userId, productId });

  const data = await getEnrichedCart(userId, SHIPPING_FEE);

  res.status(200).json({
    success: true,
    message: "Price confirmed",
    data,
  });
});

module.exports = {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  mergeCart,
  confirmPriceChange,
};
