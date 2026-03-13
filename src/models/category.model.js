const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      unique: true,
    },
    slug: { type: String, required: true, unique: true, lowercase: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false },
);

const SubcategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Subcategory name is required"],
      trim: true,
    },
    slug: { type: String, required: true, unique: true, lowercase: true },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false },
);
SubcategorySchema.index({ category: 1 });

const Category = mongoose.model("Category", CategorySchema);
const Subcategory = mongoose.model("Subcategory", SubcategorySchema);

module.exports = { Category, Subcategory };
