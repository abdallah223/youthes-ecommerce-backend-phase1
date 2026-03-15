const mongoose = require("mongoose");

const OrderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productName: { type: String, required: true },
    productImage: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const OrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: {
      type: [OrderItemSchema],
      validate: {
        validator: (items) => items.length > 0,
        message: "Order must have at least one item",
      },
    },
    deliveryPhone: {
      type: String,
      required: [true, "Delivery phone is required"],
      trim: true,
    },
    deliveryAddress: {
      type: String,
      required: [true, "Delivery address is required"],
      trim: true,
    },
    shippingFee: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: ["COD"], default: "COD" },
    status: {
      type: String,
      enum: [
        "Pending",
        "Prepared",
        "Shipped",
        "Delivered",
        "CancelledByUser",
        "CancelledByAdmin",
        "Rejected",
      ],
      default: "Pending",
    },
    cancelledBy: { type: String, enum: ["user", "admin"] },
    cancellationReason: { type: String, trim: true },
  },
  { timestamps: true, versionKey: false },
);

OrderSchema.index({ user: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ createdAt: -1 });

const Order = mongoose.model("Order", OrderSchema);
module.exports = Order;
