const express=require('express')
const admin=express.Router()
const {upload,uploadFields}=require('../config/multer')


const{loadLogin,login,logout,loadProduct,loadUser,blockUser,
    unblockUser,addCategory,loadCategory,loadBrand,
    addBrand,categoryDelete,categoryEdit,brandDelete,brandEdit,addProduct,deleteProduct,
    loadAddProduct}=require('../controller/adminController')

admin.get('/login',loadLogin)
admin.post('/login',login)

admin.get('/products',loadProduct)
admin.get('/products/add',loadAddProduct)
admin.post('/products/add',upload.array('images',3),addProduct)
admin.post('/products/delete/:id',deleteProduct)
admin.get('/dashboard',(req,res)=>{
    res.render('admin/dashboard')
})

admin.get('/user',loadUser)
admin.post('/user/block/:id',blockUser)
admin.post('/user/unblock/:id',unblockUser)
admin.get('/logout',logout)


admin.get('/category',loadCategory)
admin.post('/category/add',upload.single('imageUrl'),addCategory)
admin.post('/category/delete/:id',categoryDelete)
admin.post('/category/edit/:id',upload.single('imageUrl'),categoryEdit)

admin.get('/brand',loadBrand)
admin.post('/brand/add',addBrand)
admin.post('/brand/delete/:id',brandDelete)
admin.post('/brand/edit/:id',brandEdit)
module.exports=admin