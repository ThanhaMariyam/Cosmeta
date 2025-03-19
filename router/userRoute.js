const express = require("express");
const user = express.Router();
const passport = require("passport");
const {
  loadSignup,
  postSignup,
  loadOtp,
  verifyOtp,
  loadLogin,
  login,
  loadEmail,
  forgotOtp,
  loadResetPassword,
  SetNewPassword,
  resendOtp,
} = require("../controller/user/userController");
const {
  categoryLoad,
  getCategoryProd,
  getProduct,
  getHome,
  googleHome,
  loadBrand,
  getBrandProd,
  getBrandProduct,
  getDetails,
} = require("../controller/user/userProductController");
const {
  loadProfile,
  logout,
  saveProfile,
  loadPassword,
  changePassword,
  deleteUser,
  loadAddress,
  loadAddAddress,
  addAddress,
  deleteAddress,
  editAddress,
 
  

} = require("../controller/user/profileController")

const {loadCart,addToCart,remvCart,updateCart}=require("../controller/user/cartController")

const {addWishlist,remvWishlist,loadWishlist}=require("../controller/user/wishlistController")

const { checkSession, isLogin } = require("../middleware/userAuth");
const { loadCheckout,addCheckoutAddress,placeOrder,getconfirm,orderDetails,
   order,downloadInvoice,cancelOrder,cancelItem, returnItem }
 = require("../controller/user/orderController")


user.get("/signup",isLogin, loadSignup);
user.post("/signup", postSignup);

user.get("/login",isLogin, loadLogin);
user.post("/login", login);

user.get("/otp", loadOtp);
user.post("/otp", verifyOtp);

user.get("/forgot", loadResetPassword);
user.post("/forgot", SetNewPassword);

user.get("/email", loadEmail);
user.post("/email", forgotOtp);

user.post("/resend-otp", resendOtp);

user.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);
user.get(
"/user/auth/google/callback",
passport.authenticate("google", { failureRedirect: "/user/login" }),
(req, res, next) => {
  console.log("Google Authenticated User:", req.user);
  req.session.user = req.user;
  
  req.session.save((err) => {
    if (err) {
      console.error("Session save error:", err);
      return res.redirect("/user/login");
    }
    console.log("Session saved successfully!");
    next();
  });
},
googleHome);
user.get("/productDetails/:id", getProduct);
user.get("/category", categoryLoad);
user.get("/product", getCategoryProd);
user.get("/products", getBrandProd);
user.get("/", getHome);
user.get("/brand", loadBrand);
user.get("/ProductDetail/:id", getBrandProduct);
user.get("/Details/:id", getDetails);

user.get("/profile",checkSession,loadProfile)
user.post("/profile",checkSession,saveProfile)
user.get("/changePassword",checkSession,loadPassword)
user.post("/changePassword",checkSession,changePassword)
user.get("/deleteUser",checkSession,deleteUser)
user.get("/address",checkSession,loadAddress)
user.get("/addAddress",checkSession,loadAddAddress)
user.post("/addAddress",checkSession,addAddress)
  
user.delete("/deleteAddress",checkSession,deleteAddress)
user.put("/updateAddress",checkSession,editAddress)

user.get("/orders",order)
user.get("/orderDetails/:id",orderDetails)
user.get("/download-invoice/:orderId",downloadInvoice)
user.post("/cancel-order/:orderId", cancelOrder)
user.post("/cancel-order-item/:orderId/:productId",cancelItem)
user.post("/request-return/:orderId/:productId",returnItem)

user.get("/cart", checkSession,loadCart);
user.post('/cart/add',checkSession,addToCart)
user.post("/cart/remove",checkSession,remvCart)
user.post("/cart/update",checkSession,updateCart)

user.get("/checkout",checkSession,loadCheckout)
user.post("/checkout",checkSession,addCheckoutAddress)
user.post("/placeOrder",checkSession,placeOrder)
user.get("/orderConfirmation",checkSession,getconfirm)

user.get("/wishlist",checkSession,loadWishlist)
user.delete("/wishlist/remove/:id",checkSession,remvWishlist)
user.post("/wishlist/add/:id",checkSession,addWishlist)

user.get("/logout",logout)
user.get("/404",(req,res)=>{
  res.render("user/404.ejs")
})

module.exports = user;
