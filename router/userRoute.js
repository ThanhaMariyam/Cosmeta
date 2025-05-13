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
  searchingProduct,
  referalCode
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
const { loadCheckout,addressSelection,placeOrder,getconfirm,orderDetails,
   order,downloadInvoice,cancelOrder,cancelItem, returnItem,
   trackOrder,
   createRazorpayOrder,
   verifyPayment,
   retryPay,
   getFailed,
   getWalletBalance,
   
   }
 = require("../controller/user/orderController");
const { getWallet } = require("../controller/user/walletController");
const { applyCoupons, remvCoupon } = require("../controller/user/couponcontrol");


user.get("/signup",isLogin, loadSignup);
user.post("/signup",isLogin, postSignup);

user.get("/login",isLogin, loadLogin);
user.post("/login",isLogin, login);

user.get("/otp",isLogin, loadOtp);
user.post("/otp",isLogin, verifyOtp);
user.post("/check-referral-code",isLogin,referalCode)

user.get("/forgot",isLogin, loadResetPassword);
user.post("/forgot",isLogin, SetNewPassword);

user.get("/email",isLogin, loadEmail);
user.post("/email",isLogin, forgotOtp);

user.post("/resend-otp",isLogin, resendOtp);

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
  res.redirect('/')
},
getHome);
user.get("/productDetails/:id", getProduct);
user.get("/category", categoryLoad);
user.get("/product", getCategoryProd);
user.get("/products", getBrandProd);
user.get("/", getHome);
user.get("/brand", loadBrand);
user.get("/ProductDetail/:id", getBrandProduct);
user.get("/Details/:id", getDetails);
user.get("/search-products",searchingProduct)



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

user.get("/orders",checkSession,order)
user.get("/orderDetails/:id",checkSession,orderDetails)

user.get("/download-invoice/:orderId",checkSession,downloadInvoice)
user.post("/cancel-order/:orderId",checkSession, cancelOrder)
user.post("/cancel-order-item/:orderId/:productId",checkSession,cancelItem)
user.post("/request-return/:orderId/:productId",checkSession,returnItem)

user.get("/cart", checkSession,loadCart);
user.post('/cart/add',addToCart)
user.post("/cart/remove",checkSession,remvCart)
user.post("/cart/update",checkSession,updateCart)

user.get("/checkout",checkSession,loadCheckout)

user.post("/selectAddress",checkSession,addressSelection)
user.post("/placeOrder",checkSession,placeOrder)
user.post("/createRazorpayOrder",checkSession,createRazorpayOrder)
user.post("/verifyPayment",checkSession,verifyPayment)
user.get("/retryPayment/:orderId",checkSession,retryPay)
user.get("/getWalletBalance",checkSession,getWalletBalance)

user.get("/orderConfirmation",checkSession,getconfirm)

user.get("/wishlist",checkSession,loadWishlist)
user.delete("/wishlist/remove/:id",checkSession,remvWishlist)
user.post("/wishlist/add/:id",addWishlist)

user.get("/logout",logout)
user.get("/404",(req,res)=>{
  res.render("user/404.ejs")
})
user.get("/500",(req,res)=>{
  res.render("user/500.ejs")
})
user.get("/track/:id",checkSession,trackOrder)
user.get("/wallet",checkSession,getWallet)
user.get("/orderFailure",checkSession,getFailed);

user.post("/apply-coupon",checkSession,applyCoupons)
user.post("/remove-coupon",checkSession,remvCoupon)



module.exports = user;
