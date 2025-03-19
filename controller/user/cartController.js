const cartSchema = require("../../model/cartModel");
const productSchema = require("../../model/productModal");
const wishlistSchema = require("../../model/wishlistModel");
const loadCart = async (req, res) => {
  const userId = req.session.user._id;
  console.log(userId);

  try {
    const cart = await cartSchema
      .findOne({ userId })
      .populate("product.productId");
    console.log(cart);
    if (!cart || cart.product.length === 0) {
      return res.render("user/cart", { cart: null,cartItems:[] });
    }
    cart.subTotal = cart.product.reduce(
      (sum, item) => sum + item.productId.price * item.quantity,
      0
    );
    cart.discount = Math.round(cart.subTotal * 0.2);
    cart.deliveryCharge = 50;
    cart.totalPrice = cart.subTotal - cart.discount + cart.deliveryCharge;
    const cartItems = cart.product.map(item => item.productId._id.toString());
    res.render("user/cart",{ cart, cartItems});
  } catch (error) {
    res.status(500).json({ message: "server error" });
  }
};

const addToCart = async (req, res) => {
  try {
    console.log(req.body);
    const { productId } = req.body;
    const userId = req.session.user._id;
    const product = await productSchema.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "product not found" });
    }
    if (!product.isListed || (product.category && product.category.isListed===false)) {
      return res
        .status(403)
        .json({ success: false, message: "product cannot be added to cart" });
    }

    let cart = await cartSchema.findOne({ userId });
    console.log(cart);

    if (!cart) {
      console.log("No cart found, creating a new one...");
      cart = await cartSchema.create({ userId, product: []});
 
     
    }
    
    // Ensure the product array exists
    if (!cart.product) {
      cart.product = [];
    }

    const productIndex = cart.product.findIndex(
      (item) => item.productId.toString() === productId
    );
    let newQuantity=1
    if (productIndex >= 0) {
      newQuantity=cart.product[productIndex].quantity + 1;
      if(newQuantity>5){
        return res.status(400).json({success:false,message:"You can purchase upto 5 units of this product."})
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
    } 
     else {
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
      .status(200)
      .json({ success: true, message: "Product added to cart", cart, product });
  } catch (error) {
    console.error("Error in addToCart:", error);
    res.status(500).json({ success: false, message: "Failed to add" });
  }
};

const updateCart = async (req, res) => {
  const { productId, quantity } = req.body;
  const userId = req.session.user._id;

  try {
    const product = await productSchema.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (quantity > 5) {
      return res.status(400).json({
        success: false,
        message: "You can only purchase up to 5 units of this product",
      });
    }

    if (quantity > product.stock) {
      return res.status(400).json({
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
    return res.status(200).json({ success: true, message: "product updated succesfully"});
  } catch (error) {
    res.json({ success: false, error });
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
      return res.json({ success: false, message: "Item not found in cart" });
    }
    const cart = await cartSchema
      .findOne({ userId })
      .populate("product.productId");
    console.log(cart);
    res
      .status(200)
      .json({ success: true, message: "product removed succesfully", cart });
  } catch (error) {
    res.json({ success: false, error });
  }
};

module.exports = {
  loadCart,
  addToCart,
  remvCart,
  updateCart,
};
