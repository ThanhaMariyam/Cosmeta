const express = require("express");
const admin = express.Router();
const { upload } = require("../config/multer");

const {
  loadLogin,
  login,
  logout,

} = require("../controller/admin/adminController");
const {
  loadProduct,
  addProduct,
  productListing,
  loadAddProduct,
  productEditPage,
  editProduct,
  liveSearchProducts,
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

const {orderLists,
  orderDetails,
  orderStatus,
  returnOrder,
  approveReturn,
  rejectReturn
} = require("../controller/admin/orderManagement")

const {
  getCoupon,
  addCoupons,
  getCouponIdToEdit,
  editCoupon,
  toggleCouponStatus
  
}=require("../controller/admin/couponController")

const { checkSession, isLogin } = require("../middleware/adminAuth");
const { stockPage, updatingStock,stockSearch } = require("../controller/admin/stockController");
const { setOffer, offerStatus, editOffer, getOffer } = require("../controller/admin/offerController");
const { getDashboard,generatePDFReport,getTopSelling,downloadPDF, downloadExcel,salesReport, getTopSellingBrands, getTopSellingCategories }=require("../controller/admin/salesController");
const { getWalletTransaction, getWalletTransactionDetails } = require("../controller/admin/userWalletController");

admin.get("/login", isLogin, loadLogin);
admin.post("/login", isLogin, login);



admin.get("/products", checkSession, loadProduct);
admin.get("/products/search",liveSearchProducts )
admin.get("/products/add", checkSession, loadAddProduct);
admin.post("/products/add", upload.array("images", 3),checkSession, addProduct);
admin.get("/products/edit/:id", checkSession, productEditPage);
admin.post("/products/edit/:id", upload.array("images", 3), editProduct);
admin.post("/products/toggle-list/:id", productListing);
admin.get("/inventory",stockPage)
admin.get("/inventory/search",stockSearch)
admin.post("/updateStock/:productId",updatingStock)

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

admin.get("/orderManagement",orderLists)
admin.get("/orderDetails/:orderId",orderDetails)
admin.put("/updateOrderStatus/:orderId",orderStatus)
admin.get("/return",returnOrder)
admin.post("/approveReturn/:orderId/:productId",approveReturn)
admin.post("/rejectReturn/:orderId/:productId",rejectReturn)

admin.get("/coupon",getCoupon)
admin.post("/coupons/add",addCoupons)
admin.get("/coupons/:id",getCouponIdToEdit)
admin.put("/coupons/edit/:id",editCoupon)
admin.put("/coupons/toggle/:id",toggleCouponStatus)

admin.post("/offers/add",setOffer)
admin.put("/offers/toggle/:id",offerStatus)
admin.put("/offers/edit/:id",editOffer)
admin.get("/offer",getOffer)

admin.get("/dashboard",getDashboard)
admin.get("/salesPdf",generatePDFReport)
admin.get("/topSelling",getTopSelling)
admin.get("/topSellingBrand",getTopSellingBrands)
admin.get("topSellingCategory",getTopSellingCategories)
admin.get("/salesReport",salesReport)
admin.get("/downloadPdf",downloadPDF)
admin.get("/downloadExcel",downloadExcel)

admin.get('/userWallet',getWalletTransaction)
admin.get('/wallet/transaction/:id',getWalletTransactionDetails)

admin.get("/500",(req,res)=>{
  res.render("admin/admin500")
})

module.exports = admin;
