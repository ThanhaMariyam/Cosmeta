const categorySchema=require("../../model/categoryModel")
const brandSchema=require("../../model/brandModel")
const productSchema=require("../../model/productModal")
const userSchema=require("../../model/userModel")
const cartSchema=require("../../model/cartModel")



const getHome=async(req,res)=>{
  try{
   
    
    const limit=8
    const products=await productSchema.find().sort({createdAt:-1}).limit(limit).lean()
    const productOff=await productSchema.find({price:{$gte:1500}}).sort({stock:-1,price:1}).limit(limit).lean()
    let productInCart=[]
    if(req.session.user){
      const userId=req.session.user._id
      const cart=await cartSchema.findOne({userId}).select('product.productId')
      if(cart){
        productInCart=cart.product.map((item)=>item.productId.toString())
      }

    }

    res.render('user/home',{products,productOff,productInCart})
  
  }
  
  catch(error){
    console.log(error)
    res.status(500).send("Error loading home page");
    
    
  }
}

const googleHome=async (req, res) => {
  try{
    
    const limit=8
    const products=await productSchema.find().sort({createdAt:-1}).limit(limit).lean()
    const productOff=await productSchema.find({price:{$gte:1500}}).sort({stock:-1,price:1}).limit(limit).lean()
    let productInCart=[]
    if(req.session.user){
      const userId=req.session.user._id
      const cart=await cartSchema.findOne({userId}).select('product.productId')
      if(cart){
        productInCart=cart.product.map((item)=>item.productId.toString())
      }

    }

    res.render('user/home',{products,productOff,productInCart})
  
  }
  catch(error){
    console.log(error);
    res.status(500).send("Error loading home page");
    
  }
  }

const getDetails=async(req,res)=>{
  try{
    const user=req.session.user || null
    const productId=req.params.id
    const foundProduct=await productSchema.findById(productId)
    const userId=req.session.user._id
    if(!foundProduct){
       res.status(404).send("not found")
    }
    const category = await categorySchema.findById(foundProduct.category).lean();

    if (!category) {
      return res.status(404).render("user/404");
    }
    const brand = await brandSchema.findById(foundProduct.brand).lean();

    if (!brand) {
      return res.status(404).render("user/404");
    }
    
    let isProductExist=false
    if(user){
     isProductExist = await cartSchema.findOne({
        userId:user._id,
        product: { $elemMatch: { productId } } // Check if product array contains the given productId
    });
    

    }


    
    const similarProducts = await productSchema
      .find({ category: foundProduct.category }).sort({stock:-1})
      .lean()
      .limit(8)
      
       

    res.render('user/Details',{product:foundProduct, category,brand,similarProducts,user,isProductExist})
    
  }
  catch(error){
    console.log(error);
    res.status(500).send("error")
    
  }
}

const loadBrand=async(req,res)=>{
    try{
      const user=req.session.user || null
      const page=parseInt(req.query.page)|| 1
          const limit=12
          const skip=(page-1)*limit
      const brands=await brandSchema.find({isListed:true}).skip(skip).limit(limit).lean()
       const totalUserBrand=await brandSchema.countDocuments({isListed:true})
              const totalPages=Math.ceil(totalUserBrand/limit)
      res.render('user/userBrand',{brands,currentPage:page,totalPages,user})
    }
    catch(error){
      console.log(error);
      res.status(500).send("error")
      
    }
    
  }
  
  const getBrandProd=async(req,res)=>{
    try{
      const user=req.session.user || null
      const page=parseInt(req.query.page)|| 1
      const limit=8
      const skip=(page-1)*limit
      const brandId=req.query.brand
      if (!brandId) {
              return res.status(400).render("user/404");
          }
      const brand=await brandSchema.findById(brandId).lean()
      const products=await productSchema.find({brand:brandId,isListed:true}).sort({stock:-1}).lean().skip(skip).limit(limit)
      
      const totalUserBrandProduct=await productSchema.countDocuments({brand:brandId,isListed:true})
              const totalPages=Math.ceil(totalUserBrandProduct/limit)
      res.render('user/brandProducts',{products,brand,currentPage:page,totalPages,user})
    }
    catch(error){
      console.log(error);
      res.status(500).send("error")
      
    }
  }

  const getBrandProduct=async(req,res)=>{
    try{
      const user=req.session.user || null
      const productId=req.params.id
      const foundProduct=await productSchema.findById(productId).populate({path:'brand', select:'name'})
  
      if(!foundProduct){
        return res.status(404).render("user/404");
      }
      const brand = await brandSchema.findById(foundProduct.brand).lean();
  
      if (!brand) {
        return res.status(404).render("user/404");
      }
      const category = await categorySchema.findById(foundProduct.category).lean();
  
      if (!category) {
        return res.status(404).render("user/404");
      }
      let isProductExist=false
      if(user){
       isProductExist = await cartSchema.findOne({
          userId:user._id,
          product: { $elemMatch: { productId } } // Check if product array contains the given productId
      });
      

      }
  
      
      const similarProducts = await productSchema
        .find({ category: foundProduct.category }).sort({stock:-1})
        .lean()
        .limit(8)
        
         
  
      res.render('user/brandProdDetail',{product:foundProduct, category,brand,similarProducts,user,isProductExist})
      
    }
    catch(error){
      console.log(error);
      res.status(500).send("error")
      
    }
  }

  const categoryLoad=async(req,res)=>{
    try{
      const user=req.session.user || null
      const page=parseInt(req.query.page)|| 1
          const limit=8
          const skip=(page-1)*limit
      const categories=await categorySchema.find({isListed:true}).skip(skip).limit(limit).lean()
       const totalUserCat=await categorySchema.countDocuments({isListed:true})
              const totalPages=Math.ceil(totalUserCat/limit)
            
      res.render('user/userCategory',{categories,currentPage:page,totalPages,user})
    }
    catch(error){
      console.log(error);
      res.status(500).send("error")
      
    }
  }
  
  const getCategoryProd=async(req,res)=>{
    try{
      const user=req.session.user || null
      const page=parseInt(req.query.page)|| 1
      const limit=8
      const skip=(page-1)*limit
      const categoryId=req.query.category
      if (!categoryId) {
              return res.status(400).render("user/404");
          }
      const category=await categorySchema.findById(categoryId).lean()
      const products=await productSchema.find({category:categoryId,isListed:true}).sort({stock:-1}).lean().skip(skip).limit(limit)
      
      const totalUserProduct=await productSchema.countDocuments({category:categoryId,isListed:true})
              const totalPages=Math.ceil(totalUserProduct/limit)
              let productInCart=[]
    if(req.session.user){
      const userId=req.session.user._id
      const cart=await cartSchema.findOne({userId}).select('product.productId')
      if(cart){
        productInCart=cart.product.map((item)=>item.productId.toString())
      }

    }
      res.render('user/userProduct',{products,category,currentPage:page,totalPages,user,productInCart})
    }
    catch(error){
      console.log(error);
      res.status(500).send("error")
      
    }
  }
  
  const getProduct=async(req,res)=>{
    try{
      const user=req.session.user || null
      console.log(user);
      
      const productId=req.params.id
      const foundProduct=await productSchema.findById(productId).populate({path:'category', select:'name'})
      
      if(!foundProduct){
        return res.status(404).render("user/404");
      }
      const category = await categorySchema.findById(foundProduct.category).lean();
  
      if (!category) {
        return res.status(404).render("user/404");
      }
      const brand = await brandSchema.findById(foundProduct.brand).lean();
  
      if (!brand) {
        return res.status(404).render("user/404");
      }
      let isProductExist=false
      if(user){
       isProductExist = await cartSchema.findOne({
          userId:user._id,
          product: { $elemMatch: { productId } } // Check if product array contains the given productId
      });
      

      }
      
      
      const similarProducts = await productSchema
        .find({ category: foundProduct.category }).sort({stock:-1})
        .lean()
        .limit(8)
        
         
  
      res.render('user/productDetails',{product:foundProduct, category,brand,similarProducts,user,isProductExist})
      
    }
    catch(error){
      console.log(error);
      res.status(500).send("error")
      
    }
  }


  module.exports={
  categoryLoad,
  getCategoryProd,
  getProduct,
  getHome,
  loadBrand,
  getBrandProd,
  getBrandProduct,
  getDetails,
  googleHome
  }
  
  