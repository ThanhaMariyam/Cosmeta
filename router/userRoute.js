const express = require("express");
const user = express.Router();
const productSchema = require("../model/productModal");
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
  loadCart,
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
  logout
} = require("../controller/user/profileController")

const { checkSession, isLogin } = require("../middleware/userAuth");

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
passport.authenticate("google", { failureRedirect: "/user/login" }),googleHome);
user.get("/productDetails/:id", getProduct);
user.get("/category", categoryLoad);
user.get("/product", getCategoryProd);
user.get("/products", getBrandProd);
user.get("/", getHome);
user.get("/brand", loadBrand);
user.get("/ProductDetail/:id", getBrandProduct);
user.get("/Details/:id", getDetails);
user.get("/cart", checkSession, loadCart);
user.get("/profile",loadProfile)
user.get("/logout",logout)

module.exports = user;
