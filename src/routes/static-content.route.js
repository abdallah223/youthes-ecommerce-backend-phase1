const { Router } = require("express");
const { protect, authorize } = require("../middleware/auth.middleware");
const {
  getPage,
  updateAboutUs,
  updateFaq,
} = require("../controllers/static-content.controller");

const router = Router();

router.get("/:key", getPage);

router.use(protect, authorize("admin"));

router.put("/admin/about_us", updateAboutUs);
router.put("/admin/faq", updateFaq);

module.exports = router;
