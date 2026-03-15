const { Router } = require("express");
const { protect, authorize } = require("../middleware/auth.middleware");

const {
  getApprovedTestimonials,
  createTestimonial,
  getTestimonialsAdmin,
  updateTestimonialStatus,
} = require("../controllers/testimonial.controller");

const router = Router();

router.get("/approved", getApprovedTestimonials);

router.use(protect);

router.post("/", authorize("user"), createTestimonial);

router.use(authorize("admin"));

router.get("/admin", getTestimonialsAdmin);
router.patch("/admin/:id", updateTestimonialStatus);

module.exports = router;
