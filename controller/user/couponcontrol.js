const couponSchema = require("../../model/couponModel");
const cartSchema = require("../../model/cartModel");
const orderSchema = require("../../model/orderModel");
const categorySchema = require("../../model/categoryModel");
const httpStatus = require("../../utils/httpStatus");

const applyCoupons = async (req, res) => {
  const { couponCode } = req.body;
  const userId = req.session.user._id;

  try {
    const cart = await cartSchema
      .findOne({ userId })
      .populate("product.productId");
    if (!cart) {
      return res
        .status(httpStatus.HttpStatus.NOT_FOUND)
        .json({ success: false, message: "Cart not found" });
    }

    const coupon = await couponSchema.findOne({
      code: couponCode,
      isActive: true,
    });

    if (!coupon) {
      return res.json({ success: false, message: "Invalid or expired coupon" });
    }

    const categories = await categorySchema.find(
      {},
      { name: 1, categoryOffer: 1 }
    );
    const categoryOfferMap = {};
    for (const cat of categories) {
      categoryOfferMap[cat.name] = cat.categoryOffer || 0;
    }

    let subTotal = 0;

    for (const item of cart.product) {
      const product = item.productId;
      const quantity = item.quantity;

      const productOffer = product.productOffer || 0;
      const categoryOffer = categoryOfferMap[product.category] || 0;

      const bestOffer = Math.max(productOffer, categoryOffer);
      const discountedPrice = Math.round(product.price * (1 - bestOffer / 100));

      subTotal += discountedPrice * quantity;
    }

    const deliveryCharge = 50;
    let totalPrice = subTotal + deliveryCharge;

    if (totalPrice < coupon.minOrderAmount) {
      return res.json({
        success: false,
        message: `Minimum order amount ₹${coupon.minOrderAmount} required`,
      });
    }

    const couponDiscount = coupon.discountAmount;
    totalPrice -= couponDiscount;

    req.session.appliedCoupon = couponCode;

    const pendingOrder = await orderSchema.findOne(
      { user: userId, orderStatus: "Processing" },
      {},
      { sort: { placedAt: -1 } }
    );

    if (pendingOrder) {
      await orderSchema.updateOne(
        { _id: pendingOrder._id },
        { $set: { couponApplied: couponCode } }
      );
    }

    return res.status(httpStatus.HttpStatus.OK).json({
      success: true,
      message: "Coupon applied successfully",
      discountAmount: couponDiscount,
      subTotal: subTotal,
      deliveryCharge: 50,
      newTotal: totalPrice,
    });
  } catch (error) {
    console.error("Error applying coupon:", error);
    return res
      .status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Something went wrong" });
  }
};

const remvCoupon = async (req, res) => {
  const userId = req.session.user._id;

  try {
    const cart = await cartSchema
      .findOne({ userId })
      .populate("product.productId");
    if (!cart) {
      return res
        .status(httpStatus.HttpStatus.NOT_FOUND)
        .json({ success: false, message: "Cart not found" });
    }
    const categories = await categorySchema.find(
      {},
      { name: 1, categoryOffer: 1 }
    );
    const categoryOfferMap = {};
    for (const cat of categories) {
      categoryOfferMap[cat.name] = cat.categoryOffer || 0;
    }

    let subTotal = 0;

    for (const item of cart.product) {
      const product = item.productId;
      const quantity = item.quantity;

      const productOffer = product.productOffer || 0;
      const categoryOffer = categoryOfferMap[product.category] || 0;

      const bestOffer = Math.max(productOffer, categoryOffer);
      const discountedPrice = Math.round(product.price * (1 - bestOffer / 100));

      subTotal += discountedPrice * quantity;
    }

    const deliveryCharge = 50;
    const totalPrice = subTotal + deliveryCharge;
    req.session.appliedCoupon = null;

    await orderSchema.updateOne(
      { user: userId, orderStatus: "Processing" },
      { $set: { couponApplied: "NIL" } }
    );

    return res.status(httpStatus.HttpStatus.OK).json({
      success: true,
      message: "Coupon removed successfully",
      discountAmount: 0,
      newTotal: totalPrice,
    });
  } catch (error) {
    console.error("Error removing coupon:", error);
    return res
      .status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Something went wrong" });
  }
};

module.exports = {
  applyCoupons,
  remvCoupon,
};
