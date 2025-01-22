const adminSchema=require("../model/adminModel")
const userSchema=require('../model/userModel')
const categorySchema=require("../model/categoryModel")
const product=require('../model/productModal')
const brandSchema=require('../model/brandModel')
const { name } = require("ejs")



const loadLogin=(req,res)=>{
    res.render('admin/adminLogin',{message:req.session.message || ''})
    req.session.message=null
}

const login=async(req,res)=>{
    try{
        const{username,password}=req.body
        const admin=await adminSchema.findOne({username,password})
        if(!admin){
            return res.render('admin/adminLogin',{message:"Ivalid username or password"})
        }
        res.render('admin/dashboard')
    }
    catch(err){
        console.log(err)
        res.render('admin/adminLogin',{message:"something went wrong"})
    }
}

const logout=(req,res)=>{
    res.render('admin/adminLogin',{message:req.session.message || ''})
    req.session.message=null
}


const loadProduct=async(req,res)=>{
    try{
        const products=await product.find()
        const brands=await brandSchema.find()
        const categories=await categorySchema.find()
        res.render('admin/products',{products,brands,categories})
    }
    catch(error){
        console.log(error);
        res.status(500).send("server error")
        
    }
}
const loadAddProduct=async(req,res)=>{
    try{
        const brands=await brandSchema.find()
        const categories=await categorySchema.find()
        res.render('admin/addProduct',{brands,categories})
    
    }
    catch(error){
        console.log(error);
        res.status(500).send("error")
        
    }
}

const addProduct=async(req,res)=>{
    console.log('Files:', req.files); 
    try{
        const {name,brand,category,price,stock,description,shades,colorNames}=req.body
        if(!req.files){
            return res.status(400).send("image is required")

        }   
        if (!name || !brand || !category || !price || !stock || !description ) {
            return res.status(400).send("All fields are required");
          }
       
        const images= req.files.map((item) => item.path);
        
        const shadeColors = Array.isArray(shades) ? shades : [shades];
    const shadeNames = Array.isArray(colorNames) ? colorNames : [colorNames];
    // const colors=[]
    // for(let i=0;i<shadeColors.length;i++){
    //     const colorCode=shadeColors[i]
    //     const colorName=shadeNames[i]
    //     let colorObject={code:colorCode,name:colorName}
    //     colors.push(colorObject)

    // }
    // console.log(colors)
    
    

    if (shadeColors.length !== shadeNames.length) {
      return res.status(400).send("Shades and color names must match");
    }

    const shadesData = shadeColors.map((color, index) => ({
      color,
      name: shadeNames[index],
    }));
    console.log(shadeColors);
       
        const newProduct=new product({
            name,
            brand,
            category,
            price,
            stock,
            description,
            shades:shadesData,
            images
        })
        await newProduct.save()
        await brandSchema.findByIdAndUpdate(brand,{$inc:{productCount:1}},{new:true})
        await categorySchema.findByIdAndUpdate(category,{$inc:{productCount:1}},{new:true})
        res.status(201).json({data:newProduct,message:"ok"})
    }
    catch(error){
        console.log(error);
        res.status(500).json({error:"internal server error"})
        
    }
}

const deleteProduct=async(req,res)=>{
    try{
        const productId=req.params.id
        const productToDel=await product.findById(productId)
        const brandId=productToDel.brand
        const catId=productToDel.category

        await brandSchema.findByIdAndUpdate(brandId,{$inc:{productCount:-1}},{new:true})
        await categorySchema.findByIdAndUpdate(catId,{$inc:{productCount:-1}},{new:true})
        await product.findByIdAndDelete(productId)
        res.redirect('/admin/products')

    }
    catch(error){
        console.log(error);
        res.status(500).send("error")
        
    }
}

const loadUser=async(req,res)=>{
    try{
        const user=await userSchema.find()
        res.render('admin/user',{users:user})
    }
    catch(error){
        console.log(error);
        res.status(500).send("error")
        
    }
}

const blockUser=async (req,res)=>{
    try{
        const userId=req.params.id
        await userSchema.findByIdAndUpdate(userId, {isBlocked:true})
        res.redirect('/admin/user')
    }
    catch(error){
        console.log(error);
        res.status(500).send('error blocking user')
        
    }
}

const unblockUser=async(req,res)=>{
    try{
        const userId=req.params.id
        await userSchema.findByIdAndUpdate(userId,{isBlocked:false})
        res.redirect('/admin/user')
    }
    catch(error){
        console.log(error);
        res.status(500).send("error unblocking user")
        
    }
}

const addCategory = async (req, res) => {
    try {
        

        const { name, description } = req.body;

        // Ensure the file was uploaded
        if (!req.file) {
            return res.status(400).send("Image is required");
        }

        const imageUrl = req.file.path;  // Cloudinary URL of the uploaded image

        // Ensure that name and imageUrl are provided
        if (!name || !imageUrl) {
            return res.status(400).send("Name and image are required");
        }

 
        // Create a new category with the name, description, and image URL
        const newCategory = new categorySchema({
            name,
            imageUrl,
            description,
            productCount: 0
        });


        console.log("reaching before saving the product")
        // Save the new category to the database
        await newCategory.save();
        res.status(201).json({data : newCategory , message:'ok'})
    } catch (error) {
        console.log(error);
        res.status(500).send("Internal server error");
    }
};

const loadCategory=async(req,res)=>{
    try{
        const categories=await categorySchema.find()
        res.render('admin/category',{categories})
    }
    catch(error){
        console.log(error);
        res.status(500).send("error")
        
    }
    
}
const loadBrand=async(req,res)=>{
    try{
        const brands=await brandSchema.find()
        res.render('admin/brand',{brands})
    }
    catch(error){
        console.log(error);
        res.status(500).send("error")
        
    }
}

const categoryEdit=async(req,res)=>{
    try{
        const categoryId=req.params.id
        const {name,description}=req.body
        let updateData={name,description}
        if(req.file ){
           
            updateData.imageUrl=req.file.path
        }
        const updateCategory=await categorySchema.findByIdAndUpdate(categoryId,updateData,{new:true})
        res.status(200).json({data:updateCategory,message:"updated succesfully"})
    }
    catch(error){
        console.log(error);
        res.status(500).send("error")
        
    }
}

const categoryDelete=async(req,res)=>{
    try{
        const categoryId=req.params.id
        await categorySchema.findByIdAndDelete(categoryId)
        res.redirect('/admin/category')
    }
    catch(error){
        console.log(error);
        res.status(500).send("error")
        
    }
}

const addBrand=async (req,res)=>{
    try{
        const {name,description,origin,status}=req.body
        console.log(req.body)
        if(!name){
            res.status(400).send("brand name is required")
        }
       
        const newBrand=new brandSchema({
            name,
            description,
            origin,
            status,
            
        })
        await newBrand.save()
        res.redirect('/admin/brand')
    }
    catch(error){
        console.log(error);
        res.status(500).send("error")
        
    }
}

const brandDelete=async(req,res)=>{
    try{
        const brandId=req.params.id
        await brandSchema.findByIdAndDelete(brandId)
        res.redirect('/admin/brand')
    }
    catch(error){
        console.log(error);
        res.status(500).send("error")
        
    }
}
const brandEdit=async(req,res)=>{
    try{

        const brandId=req.params.id
    const {name,description}=req.body
    let update={name,description}
    await brandSchema.findByIdAndUpdate(brandId,update,{new:true})
    const brands=await brandSchema.find()
    res.render('admin/brand',{brands})

    }
    catch(error){
        console.log(error);
        res.status(500).send("error")
        
    }
    
}


module.exports={
    loadLogin,
    login,
    logout,
    loadProduct,
    loadAddProduct,
    addProduct,
    deleteProduct,
    loadUser,
    blockUser,
    unblockUser,
    addCategory,
    loadCategory,
    categoryDelete,
    categoryEdit,
    loadBrand,
    addBrand,
    brandDelete,
    brandEdit
}