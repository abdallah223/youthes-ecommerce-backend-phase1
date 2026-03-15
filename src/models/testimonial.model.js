const mongoose = require("mongoose");

const TestimonialSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true, trim: true },
    reviewText: {
      type: String,
      required: [true, "Review text is required"],
      trim: true,
      minlength: 10,
      maxlength: 500,
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: 1,
      max: 5,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "ignored"],
      default: "pending",
    },
  },
  { timestamps: true, versionKey: false },
);

TestimonialSchema.index({ status: 1 });
TestimonialSchema.index({ user: 1 });

const Testimonial = mongoose.model("Testimonial", TestimonialSchema);
module.exports = Testimonial;
