const userSchema = require("../../model/userModel");
const orderSchema = require("../../model/orderModel");
const productSchema = require("../../model/productModal");
const walletHistorySchema = require("../../model/walletHistory");
const walletSchema = require("../../model/walletModel");
const couponSchema = require("../../model/couponModel");
const categorySchema = require("../../model/categoryModel");
const httpStatus = require("../../utils/httpStatus");
const mongoose = require("mongoose");
const crypto=require('crypto')

const orderLists = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 9;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const statusFilter = req.query.status || "";

    const filter = {};

    if (search) {
      filter.orderId = { $regex: search, $options: "i" };
    }

    if (statusFilter) {
      filter.orderStatus = statusFilter;
    }

    const orders = await orderSchema
      .find(filter)
      .populate("user", "username")
      .populate("deliveryAddress")
      .sort({ placedAt: -1 })
      .skip(skip)
      .limit(limit);
    const totalOrders = await orderSchema.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / limit);
    if (!orders || orders.length === 0) {
      return res.render("admin/orderManagement", { orders: [] });
    }

    res.render("admin/orderManagement", {
      orders,
      currentPage: page,
      totalPages,
      search,
      statusFilter,
    });
  } catch (error) {
    console.log(error);
    res.status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR).render("admin/admin500")
  }
};
const orderDetails = async (req, res) => {
  try {
    const orderId = req.params.orderId;

    const orders = await orderSchema
      .findById(orderId)
      .populate("user")
      .populate("deliveryAddress")
      .populate("products.product");

    const walletRefunds = await walletHistorySchema.aggregate([
      {
        $match: {
          order_id:orderId,
          transaction_type: "credited",
        },
      },
      {
        $group: {
          _id: null,
          totalRefund: { $sum: "$transaction_amount" },
        },
      },
    ]);

    const walletRefundAmount =
      walletRefunds.length > 0 ? walletRefunds[0].totalRefund : 0;

    let productTotal = 0;
    let refundAmount = walletRefundAmount;
    let allReturnedOrCanceled = true;
    let totalDeliveredItems = 0;
    let totalRefundedItems = 0;

    const updatedProducts = await Promise.all(
      orders.products.map(async (item) => {
        const plainItem = item.toObject();
        const product = plainItem.product;
        const quantity = plainItem.quantity;

        const originalPrice = Number(product.price);
        const productOffer = product.productOffer || 0;

        let categoryOffer = 0;
        const categoryDoc = await categorySchema.findById(product.category);
        if (categoryDoc?.offer?.isActive) {
          categoryOffer = categoryDoc.offer.discountPercentage || 0;
        }

        const bestOffer = Math.max(productOffer, categoryOffer);
        const discountedPrice =
          bestOffer > 0
            ? Math.round(originalPrice - (originalPrice * bestOffer) / 100)
            : originalPrice;

        const totalPrice = discountedPrice * quantity;
        productTotal += totalPrice;

        const isDeliveredItem = item.status !== "Canceled";
        const isRefundable =
          item.status === "Returned" ||
          (item.status === "Canceled" &&
            orders.paymentMethod !== "Cash on Delivery");

        if (isDeliveredItem) totalDeliveredItems++;
        if (isRefundable) {
          refundAmount += totalPrice;
          totalRefundedItems++;
        } else {
          allReturnedOrCanceled = false;
        }

        return {
          ...plainItem,
          originalPrice,
          bestOffer,
          discountedPrice,
          totalPrice,
        };
      })
    );

    const deliveryCharge = 50;

    const couponDiscount =
      orders.couponApplied !== "NIL"
        ? (await couponSchema.findOne({ code: orders.couponApplied }))
            ?.discountAmount || 0
        : 0;

    const orderTotal = productTotal + deliveryCharge - couponDiscount;

    const allItemsCanceledOrReturned = updatedProducts.every(
      (item) => item.status === "Canceled" || item.status === "Returned"
    );

    if (allItemsCanceledOrReturned) {
      if (orders.paymentMethod !== "Cash on Delivery") {
        refundAmount += deliveryCharge;
      }

      refundAmount -= couponDiscount;

      if (refundAmount < 0) {
        refundAmount = 0;
      }
    }

    if (refundAmount > orderTotal) {
      refundAmount = orderTotal;
    }

    res.render("admin/orderDetails", {
      orders: {
        ...orders.toObject(),
        products: updatedProducts,
      },
      productTotal,
      deliveryCharge,
      couponDiscount,
      orderTotal,
      refundAmount,
    });
  } catch (error) {
    console.log("Error in orderDetails:", error);
    res
      .status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Internal Server Error" });
  }
};

const orderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const updatedOrder = await orderSchema.findByIdAndUpdate(
      orderId,
      {
        orderStatus: status,
        ...(status.toLowerCase() === "delivered" && { paymentStatus: "Paid" }),
      },
      { new: true }
    );
    if (!updatedOrder) {
      return res
        .status(httpStatus.HttpStatus.NOT_FOUND)
        .json({ success: false, message: "Order not found" });
    }

    if (status.toLowerCase() === "delivered") {
      for (const product of updatedOrder.products) {
        if (product.status !== "Canceled") {
          product.status = "Delivered";
        }
      }

      await updatedOrder.save();
    }

    res.json({
      success: true,
      newStatus: updatedOrder.orderStatus,
      paymentStatus: updatedOrder.paymentStatus,
    });
  } catch (error) {
    console.log(error);
    res
      .status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Internal server error" });
  }
};
const returnOrder = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit;
    const q = req.query.q || "";
    const regex = new RegExp(q, "i");
    const filter = {
      $and: [
        {
          products: {
            $elemMatch: { status: { $in: ["Returned", "Return Requested"] } },
          },
        },
        ...(q ? [{ orderId: { $regex: regex } }] : []),
      ],
    };

    const orders = await orderSchema
      .find(filter)
      .skip(skip)
      .limit(limit)
      .populate("user")
      .populate("products.product");
    if (!orders) {
      return res.status(httpStatus.HttpStatus.NOT_FOUND).render("user/404");
    }
    const totalReturn = await orderSchema.countDocuments(filter);
    const totalPages = Math.ceil(totalReturn / limit);

    res.render("admin/return", {
      orders,
      currentPage: page,
      totalPages,
      searchQuery: q,
    });
  } catch (error) {
    console.log(error);
    res.status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR).render("user/500");
  }
};
const approveReturn = async (req, res) => {
  console.log("Approve Return :", req.params);
  const { orderId, productId } = req.params;

  try {
    const order = await orderSchema
      .findById(orderId)
      .populate("products.product");
    if (!order) {
      return res
        .status(httpStatus.HttpStatus.NOT_FOUND)
        .json({ success: false, message: "Order not found" });
    }

    const productItem = order.products.find(
      (p) => p.product._id.toString() === productId
    );
    if (!productItem) {
      return res
        .status(httpStatus.HttpStatus.NOT_FOUND)
        .json({ success: false, message: "Product not found in order" });
    }

    productItem.status = "Returned";

    const allReturned = order.products.every((p) => p.status === "Returned");
    if (allReturned) {
      order.orderStatus = "Returned";
    }

    const deliveryCharge = 50;
    const couponDiscount =
      order.couponApplied !== "NIL"
        ? (await couponSchema.findOne({ code: order.couponApplied }))
            ?.discountAmount || 0
        : 0;

    const product = productItem.product;
    const quantity = productItem.quantity;
    const originalPrice = Number(product.price);
    const productOffer = product.productOffer || 0;

    let categoryOffer = 0;
    const categoryDoc = await categorySchema.findById(product.category);
    if (categoryDoc?.offer?.isActive) {
      categoryOffer = categoryDoc.offer.discountPercentage || 0;
    }

    const bestOffer = Math.max(productOffer, categoryOffer);
    const discountedPrice =
      bestOffer > 0
        ? Math.round(originalPrice - (originalPrice * bestOffer) / 100)
        : originalPrice;

    const itemTotalPrice = discountedPrice * quantity;
    let refundAmount = itemTotalPrice;

    let totalDeliveredItems = 0;
    let totalReturnedItems = 0;

    for (const item of order.products) {
      if (item.status !== "Canceled") totalDeliveredItems++;
      if (item.status === "Returned") totalReturnedItems++;
    }

    const remainingActiveItems = order.products.filter(
      (item) => item.status !== "Returned" && item.status !== "Canceled"
    );

    if (remainingActiveItems.length === 0) {
      refundAmount += deliveryCharge;
      refundAmount -= couponDiscount;
    }

    const originalPaidAmount = order.totalAmount || 0;
    if (refundAmount > originalPaidAmount) {
      refundAmount = originalPaidAmount;
    }

    productItem.refundedAmount = refundAmount;
    await order.save();

    const productInDb = await productSchema.findById(productId);
    if (productInDb) {
      productInDb.stock += productItem.quantity;
      await productInDb.save();
    }

    let wallet = await walletSchema.findOne({ user_id: order.user._id });
    if (!wallet) {
      wallet = new walletSchema({
        user_id: order.user._id,
        balance: refundAmount,
        
      });
    } else {
      wallet.balance += refundAmount;
      wallet.transactionId="TR#"+crypto.randomBytes(6).toString('hex'),
      await wallet.save();
    }
    
   const userOrderId=await orderSchema.findById(orderId)
    await walletHistorySchema.create({
      
      wallet_id:wallet._id,
      transactionId: wallet.transactionId,
      transaction_amount: refundAmount,
      transaction_date: new Date(),
      description: `Refund for returned product: ${product.name}`,
      transaction_type: "credited",
      order_id: userOrderId.orderId,
    });

    if (refundAmount >= 1000) {
      const user = await userSchema.findById(order.user._id);
      if (user && user.bonusPoints > 0) {
        const pointsToDeduct = Math.min(
          Math.floor(refundAmount / 1000) * 10,
          user.bonusPoints
        );
        if (pointsToDeduct > 0) {
          user.bonusPoints -= pointsToDeduct;
          await user.save();
        }
      }
    }

    console.log("Return Approved and Refund Credited");
    return res.json({
      success: true,
      message: "Return Approved & Refund Processed",
      orderStatus: order.orderStatus,
    });
  } catch (error) {
    console.error("Error in approveReturn:", error);
    return res
      .status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Internal Server Error" });
  }
};

const rejectReturn = async (req, res) => {
  console.log("Reject Return Triggered:", req.params);
  const { orderId, productId } = req.params;
  try {
    const order = await orderSchema.findById(orderId);
    if (!order) {
      console.log("Order not found");
      return res
        .status(httpStatus.HttpStatus.NOT_FOUND)
        .json({ success: false, message: "Order not found" });
    }

    const product = order.products.find(
      (p) => p.product.toString() === productId
    );
    if (product) {
      product.status = "Pending";
      product.returningReason = undefined;
      product.returnRequestedAt = undefined;
      await order.save();

      console.log("Return Rejected:", productId);
      return res.json({ success: true, message: "Return Rejected" });
    }

    console.log("Product not found in order");
    res
      .status(httpStatus.HttpStatus.NOT_FOUND)
      .json({ success: false, message: "Product not found" });
  } catch (error) {
    console.error("Error in rejectReturn:", error);
    res
      .status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Internal Server Error" });
  }
};

module.exports = {
  orderLists,
  orderDetails,
  orderStatus,
  returnOrder,
  approveReturn,
  rejectReturn,
};
