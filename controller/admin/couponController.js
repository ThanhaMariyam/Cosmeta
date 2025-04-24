const couponSchema = require("../../model/couponModel");
const httpStatus = require("../../utils/httpStatus");
const getCoupon = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;
    const q = req.query.q || "";
    const regex = new RegExp(q, "i");
    const filter = q ? { code: { $regex: regex } } : {};

    const coupons = await couponSchema
      .find(filter)
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit);
    const totalCoupon = await couponSchema.countDocuments(filter);
    const totalPages = Math.ceil(totalCoupon / limit);
    res.render("admin/couponManage", {
      coupons,
      currentPage: page,
      totalPages,
      searchQuery: q,
    });
  } catch (error) {
    console.log(error);
    res.status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR).render("user/500");
  }
};

const addCoupons = async (req, res) => {
  try {
    const { code, discountAmount, minOrderAmount, expiryDate } = req.body;

    const existingCoupon = await couponSchema.findOne({ code });
    if (existingCoupon) {
      return res
        .status(httpStatus.HttpStatus.BAD_REQUEST)
        .json({ success: false, message: "Coupon code already exists" });
    }

    const newCoupon = new couponSchema({
      code,
      discountAmount,
      minOrderAmount,
      expiryDate,

      isActive: true,
    });

    await newCoupon.save();
    res.json({ success: true, message: "Coupon added successfully" });
  } catch (error) {
    console.error("Error adding coupon:", error);
    res
      .status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Internal Server Error" });
  }
};

const editCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, minOrderAmount, discountAmount, expiryDate } = req.body;

    if (!code || !minOrderAmount || !discountAmount || !expiryDate) {
      return res
        .status(httpStatus.HttpStatus.BAD_REQUEST)
        .json({ success: false, message: "All fields are required." });
    }

    const updatedCoupon = await couponSchema.findByIdAndUpdate(
      id,
      { code, minOrderAmount, discountAmount, expiryDate },
      { new: true, runValidators: true }
    );

    if (!updatedCoupon) {
      return res
        .status(httpStatus.HttpStatus.NOT_FOUND)
        .json({ success: false, message: "Coupon not found." });
    }

    res.json({
      success: true,
      message: "Coupon updated successfully.",
      coupon: updatedCoupon,
    });
  } catch (error) {
    console.error("Error updating coupon:", error);
    res
      .status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Internal server error." });
  }
};

const getCouponIdToEdit = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await couponSchema.findById(id);

    if (!coupon) {
      return res
        .status(httpStatus.HttpStatus.NOT_FOUND)
        .json({ success: false, message: "Coupon not found" });
    }

    res.json({ success: true, coupon });
  } catch (error) {
    console.error("Error fetching coupon:", error);
    res
      .status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Internal server error" });
  }
};

const toggleCouponStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await couponSchema.findById(id);

    if (!coupon) {
      return res
        .status(httpStatus.HttpStatus.NOT_FOUND)
        .json({ success: false, message: "Coupon not found" });
    }

    coupon.isActive = !coupon.isActive;
    await coupon.save();

    res.json({
      success: true,
      message: `Coupon ${
        coupon.isActive ? "Activated" : "Deactivated"
      } successfully`,
    });
  } catch (error) {
    console.error("Error toggling coupon status:", error);
    res
      .status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  getCoupon,
  addCoupons,
  editCoupon,
  getCouponIdToEdit,
  toggleCouponStatus,
};
