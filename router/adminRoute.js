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
admin.post("/products/edit/:id", upload.array("images", 3),checkSession, editProduct);
admin.post("/products/toggle-list/:id",checkSession, productListing);
admin.get("/inventory",checkSession,stockPage)
admin.get("/inventory/search",checkSession,stockSearch)
admin.post("/updateStock/:productId",checkSession,updatingStock)

admin.get("/user", checkSession, loadUser);
admin.post("/user/block/:id",checkSession, blockUser);
admin.post("/user/unblock/:id",checkSession, unblockUser);
admin.get("/logout", checkSession, logout);

admin.get("/category", checkSession, loadCategory);
admin.post("/category/add", upload.single("imageUrl"),checkSession, addCategory);
admin.post("/category/toggle-list/:id",checkSession, categoryListing);
admin.post("/category/edit/:id", upload.single("imageUrl"),checkSession, categoryEdit);

admin.get("/brand", checkSession, loadBrand);
admin.post("/brand/add",checkSession, addBrand);
admin.post("/brand/toggle-list/:id",checkSession, brandListing);
admin.post("/brand/edit/:id",checkSession, brandEdit);

admin.get("/orderManagement",checkSession,orderLists)
admin.get("/orderDetails/:orderId",checkSession,orderDetails)
admin.put("/updateOrderStatus/:orderId",checkSession,orderStatus)
admin.get("/return",checkSession,returnOrder)
admin.post("/approveReturn/:orderId/:productId",checkSession,approveReturn)
admin.post("/rejectReturn/:orderId/:productId",checkSession,rejectReturn)

admin.get("/coupon",checkSession,getCoupon)
admin.post("/coupons/add",checkSession,addCoupons)
admin.get("/coupons/:id",checkSession,getCouponIdToEdit)
admin.put("/coupons/edit/:id",checkSession,editCoupon)
admin.put("/coupons/toggle/:id",checkSession,toggleCouponStatus)

admin.post("/offers/add",checkSession,setOffer)
admin.put("/offers/toggle/:id",checkSession,offerStatus)
admin.put("/offers/edit/:id",checkSession,editOffer)
admin.get("/offer",checkSession,getOffer)

admin.get("/dashboard",checkSession,getDashboard)
admin.get("/salesPdf",checkSession,generatePDFReport)
admin.get("/topSelling",checkSession,getTopSelling)
admin.get("/topSellingBrand",checkSession,getTopSellingBrands)
admin.get("topSellingCategory",checkSession,getTopSellingCategories)
admin.get("/salesReport",checkSession,salesReport)
admin.get("/downloadPdf",checkSession,downloadPDF)
admin.get("/downloadExcel",checkSession,downloadExcel)

admin.get('/userWallet',checkSession,getWalletTransaction)
admin.get('/wallet/transaction/:id',checkSession,getWalletTransactionDetails)

admin.get("/500",(req,res)=>{
  res.render("admin/admin500")
})

module.exports = admin;
