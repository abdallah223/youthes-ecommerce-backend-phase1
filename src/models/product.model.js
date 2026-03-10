const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      minlength: 2,
    },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    image: { type: String, required: [true, "Product image is required"] },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    subcategory: { type: mongoose.Schema.Types.ObjectId, ref: "Subcategory" },
    stockCount: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Stock cannot be negative"],
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

ProductSchema.index({ category: 1, isDeleted: 1 });
ProductSchema.index({ name: "text", description: "text" });

const Product = mongoose.model("Product", ProductSchema);
module.exports = Product;
