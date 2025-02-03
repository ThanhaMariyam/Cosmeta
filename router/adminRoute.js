const express = require("express");
const admin = express.Router();
const { upload } = require("../config/multer");

const {
  loadLogin,
  login,
  logout,
  adminHome,
} = require("../controller/admin/adminController");
const {
  loadProduct,
  addProduct,
  productListing,
  loadAddProduct,
  productEditPage,
  editProduct,
} = require("../controller/admin/productController");
const {
  addCategory,
  loadCategory,
  categoryListing,
  categoryEdit,
} = require("../controller/admin/categoryController");
const {
  loadBrand,
  addBrand,
  brandListing,
  brandEdit,
} = require("../controller/admin/brandController");
const {
    loadUser,
  blockUser,
  unblockUser
} = require("../controller/admin/customerController")

const { checkSession, isLogin } = require("../middleware/adminAuth");

admin.get("/login", isLogin, loadLogin);
admin.post("/login", isLogin, login);
admin.get("/dashboard", checkSession, adminHome);

admin.get("/products", checkSession, loadProduct);
admin.get("/products/add", checkSession, loadAddProduct);
admin.post("/products/add", upload.array("images", 3), addProduct);
admin.get("/products/edit/:id", checkSession, productEditPage);
admin.post("/products/edit/:id", upload.array("images", 3), editProduct);
admin.post("/products/toggle-list/:id", productListing);

admin.get("/user", checkSession, loadUser);
admin.post("/user/block/:id", blockUser);
admin.post("/user/unblock/:id", unblockUser);
admin.get("/logout", checkSession, logout);

admin.get("/category", checkSession, loadCategory);
admin.post("/category/add", upload.single("imageUrl"), addCategory);
admin.post("/category/toggle-list/:id", categoryListing);
admin.post("/category/edit/:id", upload.single("imageUrl"), categoryEdit);

admin.get("/brand", checkSession, loadBrand);
admin.post("/brand/add", addBrand);
admin.post("/brand/toggle-list/:id", brandListing);
admin.post("/brand/edit/:id", brandEdit);
module.exports = admin;
