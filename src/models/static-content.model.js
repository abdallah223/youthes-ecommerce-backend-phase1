const mongoose = require("mongoose");

const StaticContentSchema = new mongoose.Schema(
  {
    pageKey: {
      type: String,
      enum: ["about_us", "faq"],
      required: true,
      unique: true,
    },
    content: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true, versionKey: false },
);

const StaticContent = mongoose.model("StaticContent", StaticContentSchema);

module.exports = StaticContent;
