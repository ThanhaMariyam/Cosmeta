const mongoose = require("mongoose");
const userSchema = require("../../model/userModel");
const addresSchema = require("../../model/address");
const cartSchema = require("../../model/cartModel");
const productSchema = require("../../model/productModal");
const orderSchema = require("../../model/orderModel");
const walletSchema = require("../../model/walletModel");
const walletHistorySchema = require("../../model/walletHistory");
const couponSchema = require("../../model/couponModel");
const categorySchema = require("../../model/categoryModel");
const brandSchema = require("../../model/brandModel");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const Razorpay = require("razorpay");
const httpStatus = require("../../utils/httpStatus");
const crypto = require("crypto");
const { log } = require("console");
require("dotenv").config();


const loadCheckout = async (req, res) => {
  const userId = req.session.user._id;

  try {
    const cart = await cartSchema.findOne({ userId }).populate({
      path: "product.productId",
      select: "name images price category productOffer",
      model: "product",
    });

    if (!cart || cart.product.length === 0) {
      return res.render("user/checkOut", {
        shippingAddress: null,
        userAddress: [],
        cartProducts: [],
        cart: null,
        availableCoupons: [],
        appliedCoupon: null,
        couponDiscount: 0,
      });
    }

    let subTotal = 0;
    let totalDiscount = 0;
    let highestDiscount = 0;
    let originalTotal = 0;
    let cartProducts = [];

    for (const item of cart.product) {
      const product = item.productId;
      const productPrice = Number(product.price);

      const category = await categorySchema.findById(product.category);
      const categoryDiscount = category?.offer?.isActive
        ? category.offer.discountPercentage
        : 0;

      const productDiscount = product.productOffer || 0;
      const itemHighestDiscount = Math.max(productDiscount, categoryDiscount);

      const discountedPrice =
        productPrice - (productPrice * itemHighestDiscount) / 100;
      const roundedDiscountedPrice = Math.round(discountedPrice);
      console.log("rounded discount price",roundedDiscountedPrice)

      subTotal += roundedDiscountedPrice * item.quantity;
      totalDiscount += (productPrice - discountedPrice) * item.quantity;
      originalTotal += productPrice * item.quantity;

      highestDiscount = Math.max(highestDiscount, itemHighestDiscount);

      cartProducts.push({
        productId: product,
        quantity: item.quantity,
        finalPrice: roundedDiscountedPrice,
        highestDiscount: itemHighestDiscount,
      });
    }

    const amountSaved = originalTotal - subTotal;
    const deliveryCharge = 50;
    let totalPrice = subTotal + deliveryCharge;

    const userAddress = await addresSchema.find({ userId });
    let shippingAddress = req.session.selectedAddress
      ? await addresSchema.findById(req.session.selectedAddress)
      : userAddress.find((addr) => addr.isPrimary) || userAddress[0];

    const allEligibleCoupons = await couponSchema.find({
      minOrderAmount: { $lte: totalPrice },
      isActive: true,
      expiryDate: { $gte: new Date() },
    });

    let bestCoupon = null;
    if (allEligibleCoupons.length > 0) {
      bestCoupon = allEligibleCoupons.reduce((prev, curr) =>
        curr.discountAmount > prev.discountAmount ? curr : prev
      );
    }

    let appliedCoupon = null;
    let couponDiscount = 0;

    if (req.session.appliedCoupon) {
      appliedCoupon = await couponSchema.findOne({
        code: req.session.appliedCoupon,
      });
    }

    if (
      appliedCoupon &&
      appliedCoupon.isActive &&
      subTotal >= appliedCoupon.minOrderAmount
    ) {
      couponDiscount = appliedCoupon.discountAmount;
      totalPrice -= couponDiscount;
    } else {
      req.session.appliedCoupon = null;
      appliedCoupon = null;
      couponDiscount = 0;
    }

    console.log("totalPrice",totalPrice)
    res.render("user/checkOut", {
      shippingAddress,
      userAddress,
      cartProducts,
      cart: {
        subTotal: Math.round(subTotal),
        totalDiscount: Math.round(totalDiscount),
        deliveryCharge,
        totalPrice: Math.round(totalPrice),
        highestDiscount,
        originalTotal,
        amountSaved: Math.round(amountSaved),
      },
      availableCoupons: bestCoupon ? [bestCoupon] : [],
      appliedCoupon,
      couponDiscount,
    });
  } catch (error) {
    console.error("Error in loadCheckout:", error);
    res.status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR).render("user/500");
  }
};

const addressSelection = async (req, res) => {
  console.log("Address selection triggered...");

  try {
    const { addressId } = req.body;
    if (!addressId) {
      return res
        .status(httpStatus.HttpStatus.BAD_REQUEST)
        .json({ success: false, message: "Address ID is required." });
    }

    req.session.selectedAddress = addressId;
    console.log(" Address stored in session:", req.session.selectedAddress);

    req.session.save((err) => {
      if (err) {
        console.error(" Error saving session:", err);
        return res
          .status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR)
          .json({ success: false, message: "Session save failed." });
      }
      return res.json({
        success: true,
        message: "Address selected successfully.",
      });
    });
  } catch (error) {
    console.error("Error selecting address:", error);
    res
      .status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Internal server error." });
  }
};

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});


const createRazorpayOrder = async (req, res) => {
  try {
    const { amount} = req.body;

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(httpStatus.HttpStatus.BAD_REQUEST).json({
        success: false,
        message: "Invalid amount provided",
      });
    }

    let userData = {
      fullName: "Guest User",
      email: "guest@example.com",
      phone: "0000000000",
    };

    if (req.user) {
      try {
        const user = await userSchema.findById(req.user.id);
        console.log(user)
        if (user) {
          userData = {
            fullName: user.fullName || user.name,
            email: user.email,
            phone: user.phone || "0000000000",
          };
        }
      } catch (userError) {
        console.warn("Error fetching user data:", userError);
        res
          .status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR)
          .render("user/500");
      }
    }

    const orderReceipt =
      "order_" + Date.now() + "_" + Math.floor(Math.random() * 1000);

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(parseFloat(amount) * 100),
      currency: "INR",
      receipt: orderReceipt,
      payment_capture: 1,
      notes: {
        customer_name: userData.fullName,
        customer_email: userData.email,
        customer_phone: userData.phone,
      },
    });
    console.log("order amount=",razorpayOrder)

    if (!razorpayOrder || !razorpayOrder.id) {
      throw new Error("Failed to create Razorpay order");
    }

    const saveResult = await createOrderInDB(
      req,
      "online payment",
      razorpayOrder.id,
      "Pending"
    );

    if (!saveResult.success) {
      return res
        .status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: saveResult.message });
    }

    

    return res.json({
      success: true,
      order: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
      },
      key: process.env.RAZORPAY_KEY_ID,
      userData: userData,
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    res.status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Error creating order. Please try again.",
    });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } =
      req.body;

    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generatedSignature = hmac.digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res
        .status(httpStatus.HttpStatus.BAD_REQUEST)
        .json({ success: false, message: "Payment verification failed." });
    }

    const existingOrder = await orderSchema.findOne({
      razorpayOrderId: razorpay_order_id,
    });

    if (!existingOrder) {
      return res
        .status(httpStatus.HttpStatus.NOT_FOUND)
        .json({ success: false, message: "Order not found." });
    }

    existingOrder.paymentStatus = "Paid";
    existingOrder.orderStatus = "Processing";
    existingOrder.razorpayPaymentId = razorpay_payment_id;

    await existingOrder.save();

    return res.json({ success: true, message: "Order payment successful!" });
  } catch (error) {
    console.error("Error in verifyPayment:", error);
    res
      .status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Internal server error" });
  }
};

const createOrderInDB = async (
  req,
  paymentMethod,
  razorpayOrderId = null,
  paymentStatus = "pending"
) => {
  try {
    const userId = req.session.user._id;
    const userAddresses = await addresSchema.find({ userId });

    let addressId =
      req.session.selectedAddress ||
      userAddresses.find((addr) => addr.isPrimary)?._id ||
      userAddresses[0]?._id;
    if (!addressId) {
      throw new Error("No valid delivery address found.");
    }

    const cart = await cartSchema
      .findOne({ userId })
      .populate("product.productId");
    if (!cart || cart.product.length === 0) {
      throw new Error("Cart is empty.");
    }

    let subTotal = 0;
    let totalDiscount = 0;
    let highestDiscount = 0;
    const updatedProducts = [];

    for (const item of cart.product) {
      const product = item.productId;
      if (!product) continue;

      if (product.stock < item.quantity) {
        throw new Error(
          `${product.name} has only ${product.stock} left in stock.`
        );
      }

      const category = await categorySchema.findById(product.category);
      const brand = await brandSchema.findById(product.brand);

      let categoryDiscount = category?.offer?.isActive
        ? category.offer.discountPercentage
        : 0;
      const productDiscount = product.productOffer || 0;
      const itemHighestDiscount = Math.max(productDiscount, categoryDiscount);

      highestDiscount = Math.max(highestDiscount, itemHighestDiscount);
      const productPrice = Number(product.price);
      const discountedPrice = Math.round(
        productPrice - (productPrice * itemHighestDiscount) / 100
      );

      subTotal += discountedPrice * item.quantity;
      totalDiscount += (productPrice - discountedPrice) * item.quantity;

      updatedProducts.push({
        product: product._id,
        name: product.name,
        quantity: item.quantity,
        price: discountedPrice,
        category: category ? category.name : "",
        brand: brand ? brand.name : "",
        images: product.images.length > 0 ? product.images[0] : null,
        status: "Pending",
      });
    }

    const deliveryCharge = 50;
    let totalAmount = subTotal + deliveryCharge;

    let couponApplied = "NIL";
    let couponDiscount = 0;

    if (req.session.appliedCoupon) {
      const appliedCoupon = await couponSchema.findOne({
        code: req.session.appliedCoupon,
      });

      if (
        appliedCoupon &&
        appliedCoupon.isActive &&
        subTotal >= appliedCoupon.minOrderAmount
      ) {
        couponDiscount = appliedCoupon.discountAmount;
        totalAmount -= couponDiscount;
        couponApplied = appliedCoupon.code;
      }
    }

    const newOrder = new orderSchema({
      orderId: "#" + Date.now(),
      user: userId,
      products: updatedProducts,
      totalAmount,
      couponApplied,
      couponDiscount,
      offerDiscount: totalDiscount,
      paymentMethod,
      paymentStatus,
      razorpayOrderId,
      deliveryAddress: addressId,
      orderStatus:
        paymentMethod === "Cash on Delivery" || paymentStatus === "Paid"
          ? "Processing"
          : "pending",

      estimateDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    });

    await newOrder.save();

    for (const item of cart.product) {
      const product = item.productId;

      if (product) {
        await productSchema.updateOne(
          { _id: product._id },
          { $inc: { stock: -item.quantity } }
        );
      }
    }

    await cartSchema.updateOne(
      { userId },
      { $set: { product: [], totalPrice: 0 } }
    );

    if (totalAmount >= 1000) {
      const bonusToAdd = Math.floor(totalAmount / 1000) * 10;
      await userSchema.updateOne(
        { _id: userId },
        { $inc: { bonusPoints: bonusToAdd } }
      );
    }

    req.session.selectedAddress = null;
    req.session.appliedCoupon = null;
    return { success: true, orderId: newOrder._id };
  } catch (error) {
    console.error("Error in createOrderInDB:", error);
    return {
      success: false,
      message: error.message || "Order creation failed.",
    };
  }
};

const placeOrder = async (req, res) => {
  const {paymentMethod } = req.body;
  try {

    const userId = req.session.user._id;

    if (paymentMethod === "Wallet") {
      const wallet = await walletSchema.findOne({ user_id: userId });

      if (!wallet || wallet.balance <= 0) {
        return res
          .status(httpStatus.HttpStatus.BAD_REQUEST)
          .json({ success: false, message: "Insufficient wallet balance" });
      }

      const cart = await cartSchema
        .findOne({ userId })
        .populate("product.productId");
      if (!cart || cart.product.length === 0) {
        return res
          .status(httpStatus.HttpStatus.BAD_REQUEST)
          .json({ success: false, message: "Cart is empty." });
      }

      let subTotal = 0;
      for (const item of cart.product) {
        const product = item.productId;
        const category = await categorySchema.findById(product.category);
        const categoryDiscount = category?.offer?.isActive
          ? category.offer.discountPercentage
          : 0;
        const productDiscount = product.productOffer || 0;
        const highestDiscount = Math.max(productDiscount, categoryDiscount);
        const discountedPrice = Math.round(
          product.price - (product.price * highestDiscount) / 100
        );
        subTotal += discountedPrice * item.quantity;
      }

      const deliveryCharge = 50;
      let totalAmount = subTotal + deliveryCharge;

      if (req.session.appliedCoupon) {
        const appliedCoupon = await couponSchema.findOne({
          code: req.session.appliedCoupon,
        });
        if (
          appliedCoupon &&
          appliedCoupon.isActive &&
          subTotal >= appliedCoupon.minOrderAmount
        ) {
          totalAmount -= appliedCoupon.discountAmount;
        }
      }

      if (wallet.balance < totalAmount) {
        return res
          .status(httpStatus.HttpStatus.BAD_REQUEST)
          .json({ success: false, message: "Insufficient wallet balance" });
      }

      const orderResult = await createOrderInDB(req, "Wallet", null, "Paid");
      

      if (orderResult.success) {
        wallet.balance -= totalAmount;
        wallet.transactionId='TR#'+crypto.randomBytes(6).toString('hex')
        await wallet.save();

        const orderDoc = await orderSchema.findById(orderResult.orderId).lean();

        await walletHistorySchema.create({
          wallet_id: wallet._id,
          transactionId:wallet.transactionId,
          transaction_amount: -totalAmount,
          description: `Payment for order ${orderDoc.orderId}`,
          transaction_type: "debited",
          order_id: orderDoc.orderId,
        });

        return res
          .status(httpStatus.HttpStatus.OK)
          .json({
            success: true,
            message: "Order placed using wallet successfully.",
          });
      } else {
        return res
          .status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR)
          .json({
            success: false,
            message: orderResult.message || "Order creation failed.",
          });
      }
    }

    const codResult = await createOrderInDB(
      req,
      paymentMethod,
      null,
      "Pending"
    );
    if (codResult.success) {
      return res
        .status(httpStatus.HttpStatus.OK)
        .json({ success: true, message: "Order placed successfully." });
    } else {
      return res
        .status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR)
        .json({
          success: false,
          message: codResult.message || "Order creation failed.",
        });
    }
  } catch (error) {
    console.error(" Order placement error:", error.message);
    return res
      .status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR)
      .json({
        success: false,
        message: error.message || "Order creation failed.",
      });
  }
};

const getWalletBalance = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const wallet = await walletSchema.findOne({ user_id: userId });

    if (!wallet) {
      return res.json({ success: true, balance: 0 });
    }

    return res.json({ success: true, balance: wallet.balance });
  } catch (error) {
    console.error(" Error getting wallet balance:", error);
    return res
      .status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Failed to get wallet balance" });
  }
};

const retryPay = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    console.log("Retrying payment for order:", orderId);

    let failedOrder;

    if (mongoose.Types.ObjectId.isValid(orderId)) {
      failedOrder = await orderSchema.findOne({ _id: orderId });
    }

    if (!failedOrder) {
      failedOrder = await orderSchema.findOne({ razorpayOrderId: orderId });
    }

    console.log("Order found:", failedOrder);
    console.log("Order payment status:", failedOrder?.paymentStatus);

    if (
      !failedOrder ||
      !["Pending", "Failed"].includes(failedOrder.paymentStatus)
    ) {
      console.log("Invalid order for retry");
      return res.json({ success: false, message: "Invalid order for retry." });
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: failedOrder.totalAmount * 100,
      currency: "INR",
      receipt: "retry_" + failedOrder._id,
      payment_capture: 1,
    });

    console.log("New Razorpay order created:", razorpayOrder.id);

    failedOrder.razorpayOrderId = razorpayOrder.id;
    await failedOrder.save();

    console.log(
      "Order updated with new Razorpay order ID:",
      failedOrder.razorpayOrderId
    );

    return res.json({
      success: true,
      order: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
      },
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Error retrying payment:", error);
    res
      .status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Failed to retry payment." });
  }
};

const getconfirm = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const order = await orderSchema
      .findOne({ user: userId })
      .populate("deliveryAddress");
    console.log(order);
    const similarProducts = await productSchema
      .find()
      .sort({ stock: -1 })
      .limit(2);

    const bonus = await userSchema.findById(userId).select("bonusPoints");
    res.render("user/orderConfirmation", { similarProducts, order, bonus });
  } catch (error) {
    console.log(error);
    res.status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR).render("user/500");
  }
};

const getFailed = async (req, res) => {
  try {
    const orderId = req.query.orderId;
    console.log("Received Order ID:", orderId);

    if (!orderId) {
      return res
        .status(httpStatus.HttpStatus.BAD_REQUEST)
        .json({ success: false, message: "Order ID is required" });
    }

    let order;

    if (mongoose.Types.ObjectId.isValid(orderId)) {
      order = await orderSchema
        .findOne({ _id: orderId })
        .populate("products.product");
    }

    if (!order) {
      order = await orderSchema
        .findOne({ razorpayOrderId: orderId })
        .populate("products.product");
    }

    if (!order) {
      return res
        .status(httpStatus.HttpStatus.NOT_FOUND)
        .json({ success: false, message: "Order not found" });
    }

    res.render("user/orderFailure", { order, orderId: order._id });
  } catch (error) {
    console.error(" Error fetching failed order:", error);
    res
      .status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Internal Server Error" });
  }
};

const order = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const status = req.query.status || "";
    const limit = 6;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const filter = { user: userId };
    if (status) {
      filter.orderStatus = status;
    }

    const orders = await orderSchema
      .find(filter)
      .populate("products.product")
      .sort({ placedAt: -1 })
      .skip(skip)
      .limit(limit);



    const cartProducts = await cartSchema
      .findOne({ userId })
      .populate("product.productId");
    const totalOrders = await orderSchema.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / limit);

    res.render("user/orders", {
      orders: orders.length ? orders : [],
      cartProducts,
      currentPage: page,
      totalPages,
      statusFilter: status,
    });
  } catch (error) {
    console.log(error);
    res
      .status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Internal Server Error" });
  }
};
const trackOrder = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const orderId = req.params.id;
    const orders = await orderSchema
      .findOne({ _id: orderId, user: userId })
      .populate("products.product");
    const orderAddress = await orderSchema
      .findOne({ user: userId, _id: orderId })
      .populate("deliveryAddress");
    res.render("user/track", { orders, orderAddress });
  } catch (error) {
    console.log(error);
    res.status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR).render("user/500");
  }
};

const orderDetails = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const orderId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid order ID" });
    }

    const orders = await orderSchema
      .findOne({ user: userId, _id: orderId })
      .populate("products.product");
    const orderAddress = await orderSchema
      .findOne({ user: userId, _id: orderId })
      .populate("deliveryAddress");

    const walletRefunds = await walletHistorySchema.aggregate([
      {
        $match: {
          order_id: orderId,
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

    const refundAmount =
      walletRefunds.length > 0 ? walletRefunds[0].totalRefund : 0;

    let productTotal = 0;
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

    res.render("user/orderDetails", {
      orders: {
        ...orders.toObject(),
        products: updatedProducts,
      },
      orderAddress,
      orderId,
      orderTotal,
      refundAmount,
      couponDiscount,
    });
  } catch (error) {
    console.log("Error in orderDetails:", error);
    res
      .status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Internal Server Error" });
  }
};

const downloadInvoice = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await orderSchema
      .findById(orderId)
      .populate("products.product")
      .populate("deliveryAddress");

    if (!order)
      return res
        .status(httpStatus.HttpStatus.NOT_FOUND)
        .send("Order not found");

    const invoiceDir = path.join(__dirname, "../invoices");
    if (!fs.existsSync(invoiceDir))
      fs.mkdirSync(invoiceDir, { recursive: true });

    const filePath = path.join(invoiceDir, `invoice-${orderId}.pdf`);
    const doc = new PDFDocument({ margin: 50 });
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    doc.fontSize(20).text("Invoice", { align: "center" });
    doc.moveDown();
    doc.fontSize(14).text(`Order ID: #${order.orderId}`);
    doc.text(`Date: ${order.placedAt.toDateString()}`);
    doc.moveDown();

    doc.fontSize(12).text("Products:", { underline: true });
    doc.moveDown();

    const startX = 50;
    let y = doc.y;

    doc.font("Helvetica-Bold");
    doc.text("Name", startX, y, { width: 160 });
    doc.text("Qty", startX + 160, y, { width: 40, align: "center" });
    doc.text("Price", startX + 200, y, { width: 70, align: "right" });
    doc.text("Returned", startX + 270, y, { width: 70, align: "center" });
    doc.text("Canceled", startX + 340, y, { width: 70, align: "center" });

    doc.moveDown(0.5);
    doc.font("Helvetica");
    doc.text(
      "-----------------------------------------------------------------",
      startX,
      doc.y
    );
    doc.moveDown(0.5);

    let subTotal = 0;
    let refundAmount = 0;

    for (const item of order.products) {
      const product = item.product;
      const quantity = item.quantity;
      const originalPrice = product.price;
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

      const totalForItem = discountedPrice * quantity;
      subTotal += totalForItem;

      const isRefundable =
        item.status === "Returned" ||
        (item.status === "Canceled" &&
          order.paymentMethod !== "Cash on Delivery");

      if (isRefundable) {
        refundAmount += totalForItem;
      }

      y = doc.y;
      doc.text(product.name, startX, y, { width: 160 });
      doc.text(quantity.toString(), startX + 160, y, {
        width: 40,
        align: "center",
      });
      doc.text(`Rs.${discountedPrice}`, startX + 200, y, {
        width: 70,
        align: "right",
      });
      doc.text(item.status === "Returned" ? "Yes" : "No", startX + 270, y, {
        width: 70,
        align: "center",
      });
      doc.text(item.status === "Canceled" ? "Yes" : "No", startX + 340, y, {
        width: 70,
        align: "center",
      });

      doc.moveDown();
    }

    doc.moveDown();
    doc.text(
      "-----------------------------------------------------------------",
      startX,
      doc.y
    );
    doc.moveDown();

    const deliveryCharge = 50;
    const couponDiscount =
      order.couponApplied !== "NIL"
        ? (await couponSchema.findOne({ code: order.couponApplied }))
            ?.discountAmount || 0
        : 0;

    const allCanceledOrReturned = order.products.every(
      (item) => item.status === "Canceled" || item.status === "Returned"
    );
    if (allCanceledOrReturned && order.paymentMethod !== "Cash on Delivery") {
      refundAmount += deliveryCharge;
    }

    refundAmount -= couponDiscount;
    if (refundAmount < 0) refundAmount = 0;
    const totalPrice = subTotal + deliveryCharge - couponDiscount;
    if (refundAmount > totalPrice) refundAmount = totalPrice;

    doc.fontSize(12).text("Price Details:", { underline: true });
    doc.moveDown(0.5);
    doc.font("Helvetica");
    doc.text(`Subtotal: Rs.${subTotal}`, { align: "right" });
    doc.text(`Delivery Charge: Rs.${deliveryCharge}`, { align: "right" });
    doc.text(`Coupon Discount: -Rs.${couponDiscount}`, { align: "right" });
    doc.text(`Total Price: Rs.${totalPrice}`, { align: "right" });
    doc.text(`Refunded Amount: Rs.${refundAmount}`, { align: "right" });
    doc.text(`Payment Method: ${order.paymentMethod}`, { align: "right" });

    doc.moveDown();
    doc
      .fontSize(12)
      .text("Thank you for Visiting Cosmeta.ddns.net!", { align: "center" });

    doc.end();

    writeStream.on("finish", () => {
      res.download(filePath, `invoice-${orderId}.pdf`, (err) => {
        if (err) {
          console.log(err);
          res
            .status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR)
            .render("user/500");
        }
        fs.unlinkSync(filePath);
      });
    });
  } catch (error) {
    console.log(error);
    res.status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR).render("user/500");
  }
};

const cancelOrder = async (req, res) => {
  try {
    const { reason } = req.body;
    const orderId = req.params.orderId;

    if (!reason) {
      return res
        .status(httpStatus.HttpStatus.BAD_REQUEST)
        .json({ success: false, message: "Cancellation reason is required." });
    }

    const order = await orderSchema
      .findById(orderId)
      .populate("products.product");
    if (!order) {
      return res
        .status(httpStatus.HttpStatus.NOT_FOUND)
        .json({ success: false, message: "Order not found." });
    }

    if (order.orderStatus === "Canceled") {
      return res
        .status(httpStatus.HttpStatus.BAD_REQUEST)
        .json({ success: false, message: "Order already canceled." });
    }

    const deliveryCharge = 50;
    const couponDiscount =
      order.couponApplied !== "NIL"
        ? (await couponSchema.findOne({ code: order.couponApplied }))
            ?.discountAmount || 0
        : 0;

    let refundAmount = 0;
    let totalDeliveredItems = 0;
    let totalRefundedItems = 0;

    for (const item of order.products) {
      if (item.status === "Canceled") continue;

      const product = item.product;
      const quantity = item.quantity;

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

      const isDeliveredItem = item.status !== "Canceled";
      const isRefundable =
        isDeliveredItem && order.paymentMethod !== "Cash on Delivery";

      if (isDeliveredItem) totalDeliveredItems++;
      if (isRefundable) {
        refundAmount += totalPrice;
        totalRefundedItems++;
        item.refundedAmount = totalPrice;
      }

     
    }

    if (
      order.paymentMethod !== "Cash on Delivery" &&
      totalRefundedItems === totalDeliveredItems
    ) {
      refundAmount += deliveryCharge;
      refundAmount -= couponDiscount;
    }

    const originalPaidAmount = order.totalAmount || 0;
    if (refundAmount > originalPaidAmount) {
      refundAmount = originalPaidAmount;
    }
    await Promise.all(
      order.products.map(async (item) => {
        if (item.status !== "Canceled" && item.status !== "Returned") {
        await productSchema.updateOne(
          { _id: item.product._id },
          { $inc: { stock: item.quantity } }
        );
      }
      item.status = "Canceled";
      })
    );
   

    order.orderStatus = "Canceled";
    order.cancellationReason = reason;
    await order.save();

    if (order.paymentMethod !== "Cash on Delivery") {
      let wallet = await walletSchema.findOne({ user_id: order.user });
      if (!wallet) {
        wallet = await walletSchema.create({
          user_id: order.user,
          balance: refundAmount,

        });
      } else {
        wallet.balance += refundAmount;
        wallet.transactionId='TR#'+crypto.randomBytes(6).toString('hex')
        await wallet.save();
      }

      const userOrderId=await orderSchema.findById(orderId)
     

      await walletHistorySchema.create({
        wallet_id: wallet._id,
        transactionId: wallet.transactionId,
        transaction_amount: refundAmount,
        description: `Refund for canceled order ${userOrderId.orderId}`,
        transaction_type: "credited",
        order_id: userOrderId.orderId,
      });

      if (refundAmount >= 1000) {
        const user = await userSchema.findById(order.user);
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

   
    const userId = order.user;
    
    return res.json({
      success: true,
      message: "Order canceled and amount refunded.",
      refundAmount,
    });
  } catch (error) {
    console.error("Error canceling order:", error);
    res
      .status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Internal server error." });
  }
};

const cancelItem = async (req, res) => {
  try {
    const { reason } = req.body;
    const { orderId, productId } = req.params;

    const order = await orderSchema.findById(orderId);
    if (!order)
      return res
        .status(httpStatus.HttpStatus.NOT_FOUND)
        .json({ success: false, message: "Order not found" });

    const item = order.products.find(
      (p) => p.product?.toString() === productId
    );
    if (!item) {
      return res
        .status(httpStatus.HttpStatus.NOT_FOUND)
        .json({ success: false, message: "Product not found in order" });
    }

    if (item.status === "Canceled" || item.status === "Returned") {
      return res
        .status(httpStatus.HttpStatus.BAD_REQUEST)
        .json({ success: false, message: "Item already canceled or returned" });
    }

    const discountedPrice = item.discountedPrice || item.price;
    let refundAmount = discountedPrice * item.quantity;

    const totalDeliveredItems = order.products.filter(
      (p) => p.status !== "Canceled" && p.status !== "Returned"
    ).length;
    const totalRefundedItems = order.products.filter(
      (p) =>
        p.status === "Returned" ||
        (p.status === "Canceled" &&
          p._id.toString() !== item._id.toString() &&
          order.paymentMethod !== "Cash on Delivery")
    ).length;

    item.status = "Canceled";
    item.cancelReason = reason;
    await productSchema.updateOne(
      { _id: item.product },
      { $inc: { stock: item.quantity } }
    );

    if (
      order.paymentMethod !== "Cash on Delivery" &&
      totalRefundedItems + 1 === totalDeliveredItems
    ) {
      refundAmount += order.deliveryCharge || 0;
      refundAmount -= order.couponDiscount || 0;
    }

    if (order.paymentMethod !== "Cash on Delivery") {
      let wallet = await walletSchema.findOne({ user_id: order.user });
      if (!wallet) {
        wallet = await walletSchema.create({
          user_id: order.user,
          balance: refundAmount,
        });
      } else {
        wallet.balance += refundAmount;
        wallet.transactionId='TR#'+crypto.randomBytes(6).toString('hex')
        await wallet.save();
      }
      const userOrderId=await orderSchema.findById(orderId)

      await walletHistorySchema.create({
        wallet_id: wallet._id,
        transactionId: wallet.transactionId,
        transaction_amount: refundAmount,
        transaction_type: "credited",
        description: `Refund for canceled item: ${item.name}`,
        order_id:userOrderId.orderId,
      });

      order.refundedAmount = (order.refundedAmount || 0) + refundAmount;
    }

    const allItemsCanceled = order.products.every(
      (p) => p.status === "Canceled"
    );
    if (allItemsCanceled) {
      order.orderStatus = "Canceled";
    }

    await order.save();

    return res
      .status(httpStatus.HttpStatus.OK)
      .json({
        success: true,
        message: "Item canceled and refunded successfully",
      });
  } catch (error) {
    console.error("Cancel item error:", error);
    return res
      .status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Internal server error" });
  }
};

const returnItem = async (req, res) => {
  const { orderId, productId } = req.params;
  const { reason, productIndex } = req.body;

  try {
    const order = await orderSchema.findById(orderId);
    if (!order) {
      return res
        .status(httpStatus.HttpStatus.NOT_FOUND)
        .json({ success: false, message: "Order not found." });
    }

    order.products[productIndex].status = "Return Requested";
    order.products[productIndex].returningReason = reason;
    order.products[productIndex].returnRequestedAt = new Date();

    await order.save();

    return res.json({ success: true, message: "Return request submitted." });
  } catch (error) {
    console.log(error);
    return res
      .status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Internal Server Error." });
  }
};

module.exports = {
  loadCheckout,
  retryPay,
  addressSelection,
  placeOrder,
  createRazorpayOrder,
  getconfirm,
  orderDetails,
  order,
  downloadInvoice,
  cancelOrder,
  cancelItem,
  returnItem,
  trackOrder,
  verifyPayment,
  getFailed,
  getWalletBalance,
};
