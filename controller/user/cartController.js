const cartSchema = require("../../model/cartModel");
const productSchema = require("../../model/productModal");
const wishlistSchema = require("../../model/wishlistModel");
const categorySchema = require("../../model/categoryModel");
const httpStatus = require("../../utils/httpStatus");

const loadCart = async (req, res) => {
  const userId = req.session.user._id;

  try {
    const cart = await cartSchema
      .findOne({ userId })
      .populate("product.productId");

    if (!cart || cart.product.length === 0) {
      return res.render("user/cart", { cart: null, cartItems: [] });
    }

    let subTotal = 0;
    let totalDiscountAmount = 0;

    for (let item of cart.product) {
      const product = item.productId;
      const productPrice = Number(product.price);

      const category = await categorySchema.findById(product.category);
      const categoryDiscount = category?.offer?.isActive
        ? category.offer.discountPercentage
        : 0;

      const productDiscount = product.productOffer || 0;
      const highestDiscount = Math.max(productDiscount, categoryDiscount);

      const discountedPrice =
        productPrice - (productPrice * highestDiscount) / 100;
      const roundedDiscountedPrice = Math.round(discountedPrice);

      subTotal += roundedDiscountedPrice * item.quantity;
      totalDiscountAmount += (productPrice - discountedPrice) * item.quantity;

      item.highestDiscount = highestDiscount;
      item.discountedPrice = roundedDiscountedPrice;
    }

    const deliveryCharge = 50;
    const totalPrice = subTotal + deliveryCharge;

    cart.subTotal = Math.round(subTotal);
    cart.totalDiscount = Math.round(totalDiscountAmount);
    cart.deliveryCharge = deliveryCharge;
    cart.totalPrice = Math.round(totalPrice);

    res.render("user/cart", { cart });
  } catch (error) {
    console.error("Error in loadCart:", error);
    res.status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR).render("user/500");
  }
};

const addToCart = async (req, res) => {
  try {
    if (!req.session.user) {
      return res
        .status(httpStatus.HttpStatus.UNAUTHORIZED)
        .json({
          success: false,
          message: "unauthorized. please login to add items to cart",
        });
    }
    console.log(req.body);
    const { productId, quantity } = req.body;
    const userId = req.session.user._id;

    const product = await productSchema.findById(productId);
    if (!product) {
      return res
        .status(httpStatus.HttpStatus.NOT_FOUND)
        .json({ success: false, message: "product not found" });
    }
    if (
      !product.isListed ||
      (product.category && product.category.isListed === false)
    ) {
      return res
        .status(httpStatus.HttpStatus.FORBIDDEN)
        .json({ success: false, message: "product cannot be added to cart" });
    }

    let cart = await cartSchema.findOne({ userId });

    if (!cart) {
      console.log("No cart found, creating a new one...");
      cart = await cartSchema.create({ userId, product: [] });
    }

    if (!cart.product) {
      cart.product = [];
    }

    const productIndex = cart.product.findIndex(
      (item) => item.productId.toString() === productId
    );
    let newQuantity = quantity ? parseInt(quantity, 10) : 1;
    if (productIndex >= 0) {
      newQuantity = cart.product[productIndex].quantity + newQuantity;
      if (newQuantity > 5) {
        return res
          .status(httpStatus.HttpStatus.BAD_REQUEST)
          .json({
            success: false,
            message: "You can only purchase up to 5 units.",
          });
      }
    }
    if (newQuantity > product.stock) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} products are available in stock`,
      });
    }
    if (productIndex >= 0) {
      cart.product[productIndex].quantity = newQuantity;
    } else {
      cart.product.push({
        productId: product._id,
        quantity: newQuantity,
        brand: product.brand,
        image: product.images[0],
      });
    }
    let wishlist = await wishlistSchema.findOne({ userId });
    if (wishlist) {
      wishlist.products = wishlist.products.filter(
        (id) => id.toString() !== productId
      );
      await wishlist.save();
    }

    await cart.save();
    res
      .status(httpStatus.HttpStatus.OK)
      .json({ success: true, message: "Product added to cart", cart, product });
  } catch (error) {
    console.error("Error in addToCart:", error);
    res
      .status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Failed to add" });
  }
};

const updateCart = async (req, res) => {
  const { productId, quantity } = req.body;
  const userId = req.session.user._id;

  try {
    const product = await productSchema.findById(productId);
    if (!product) {
      return res
        .status(httpStatus.HttpStatus.NOT_FOUND)
        .json({ success: false, message: "Product not found" });
    }

    if (quantity > 5) {
      return res.status(httpStatus.HttpStatus.BAD_REQUEST).json({
        success: false,
        message: "You can only purchase up to 5 units of this product",
      });
    }

    if (quantity > product.stock) {
      return res.status(httpStatus.HttpStatus.BAD_REQUEST).json({
        success: false,
        message: `Only ${product.stock} units are available in stock`,
      });
    }
    const cart = await cartSchema
      .findOne({ userId })
      .populate("product.productId");

    const result = await cartSchema.updateOne(
      { userId, "product.productId": productId },
      { $set: { "product.$.quantity": quantity } }
    );
    if (result.modifiedCount === 0) {
      return res.json({ success: false, message: "Cart item not found" });
    }
    return res
      .status(httpStatus.HttpStatus.OK)
      .json({ success: true, message: "product updated succesfully" });
  } catch (error) {
    res
      .status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, error });
  }
};
const remvCart = async (req, res) => {
  const { productId } = req.body;
  const userId = req.session.user._id;

  try {
    const result = await cartSchema.updateOne(
      { userId },
      { $pull: { product: { productId: productId } } }
    );
    if (result.modifiedCount === 0) {
      return res
        .status(httpStatus.HttpStatus.NOT_FOUND)
        .json({ success: false, message: "Item not found in cart" });
    }
    const cart = await cartSchema
      .findOne({ userId })
      .populate("product.productId");
    console.log(cart);
    res
      .status(httpStatus.HttpStatus.OK)
      .json({ success: true, message: "product removed succesfully", cart });
  } catch (error) {
    res
      .status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, error });
  }
};

module.exports = {
  loadCart,
  addToCart,
  remvCart,
  updateCart,
};
