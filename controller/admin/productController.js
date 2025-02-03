const product=require('../../model/productModal')

const loadProduct=async(req,res)=>{
    try{
        const page=parseInt(req.query.page)|| 1
        const limit=5
        const skip=(page-1)*limit
        const products=await product.find().skip(skip).limit(limit)
        const brands=await brandSchema.find()
        const categories=await categorySchema.find()

        const totalProducts=await product.countDocuments()
        const totalPages=Math.ceil(totalProducts/limit)

        res.render('admin/products',{products,brands,categories,currentPage:page,totalPages})
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
        res.render('admin/addProduct',{brands,categories,message:req.session.message || ""})
        req.session.message=null
    
    }
    catch(error){
        console.log(error);
        res.render('admin/addProduct',{brands,categories,message:"Something went wrong!"})
        
        
    }
}

const addProduct=async(req,res)=>{
     
    try{
        
        const {name,brand,category,price,stock,description,shades,colorNames}=req.body
         
        let existName=await product.findOne({name})
        
        if(existName){
            return res.status(400).json({success:false, message:"Product name already exist."})
        }

        if(!req.files){
            return res.status(400).json({success:false, message:"Image is required."})

        }   
        if (!name || !brand || !category || !price || !stock || !description ) {
            return res.status(400).json({success:false, message:"All fields are required."})
          }
       
        const images= req.files.map((item) => item.path);
        
        const shadeColors = Array.isArray(shades) ? shades : [shades];
    const shadeNames = Array.isArray(colorNames) ? colorNames : [colorNames];
    // if (shadeColors.length !== shadeNames.length) {
    //   return res.status(400).send("Shades and color names must match");
    // }

    const shadesData = shadeColors.map((color, index) => ({
      color,
      name: shadeNames[index],
    }));
    
       
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
        res.status(201).json({data:newProduct, success:true, message:"Product added succesfully!"})
    }
    catch(error){
        console.log(error);
        return res.status(400).json({success:false, message:"something went wrong!"})
        
    }
}
const productEditPage=async(req,res)=>{
    try{
        const productId=req.params.id
        const loadProduct=await product.findById(productId)
        if(!loadProduct){
            return res.status(400).json({message:"product not found"})
        }

        const imageNames = loadProduct.images.map(path => {
            return path.split('/').pop(); // Gets the filename from the path
        });



        const brands=await brandSchema.find()
        const categories=await categorySchema.find()
        res.render('admin/editProduct',{product:loadProduct,brands,categories,imageNames})
    }
    catch(error){
        console.log(error);
        res.status(500).json({error:"error"})
        
    }
}
const editProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const { name, brand, category, price, stock, description, shades, colorNames,currentImages} = req.body;
        
        if (!name || !brand || !category || !price || !stock || !description) {
            return res.status(400).json({success:false, message:"All fields are required."});
        }

        const originalProduct = await product.findById(productId);
        if (!originalProduct) {
            return res.status(404).json({success:false, message:"Product not found"});
        }

        const shadeColors = Array.isArray(shades) ? shades : [shades];
        const shadeNames = Array.isArray(colorNames) ? colorNames : [colorNames];

        if (shadeColors.length !== shadeNames.length) {
            return res.status(400).send("Shades and color names must match");
        }

        const shadesData = shadeColors.map((color, index) => ({
            color,
            name: shadeNames[index]
        }));

        let finalImages = Array.isArray(currentImages) ? currentImages : [];
        
        if (req.files && req.files.length > 0) {
            req.files.forEach((file, index) => {
                if (file) {
                    finalImages[index] = file.path;
                }
            });
        }

        
        const updateData = {
            name,
            brand,
            category,
            price,
            stock,
            description,
            shades: shadesData,
            images:finalImages.filter(img => img)
        };

        if (originalProduct.brand.toString() !== brand.toString()) {
            await Promise.all([
                brandSchema.findByIdAndUpdate(
                    originalProduct.brand,
                    { $inc: { productCount: -1 } }
                ),
                brandSchema.findByIdAndUpdate(
                    brand,
                    { $inc: { productCount: 1 } }
                )
            ]);
        }

        // Decrement product count for the previous category if it changed
        if (originalProduct.category.toString() !== category.toString()) {
            await Promise.all([
                categorySchema.findByIdAndUpdate(
                    originalProduct.category,
                    { $inc: { productCount: -1 } }
                ),
                categorySchema.findByIdAndUpdate(
                    category,
                    { $inc: { productCount: 1 } }
                )
            ]);
        }

        const updatedProduct = await product.findByIdAndUpdate(
            productId, 
            updateData,
            
            { new: true }
        );
        
        
        res.status(200).json({
            data: updatedProduct,
            success:true,
            message: "Product updated successfully"
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success:false, message:"something went wrong!" });
    }
};

const productListing=async(req,res)=>{
    try{
        const productId=req.params.id
        const productToUpdate=await product.findById(productId)
        if (!productToUpdate) {
            return res.status(404).send("Product not found");
        }
        const newIsListed = !productToUpdate.isListed;
        const updatedProduct = await product.findByIdAndUpdate(
            productId,
            { isListed: newIsListed },
            { new: true }
        );

        res.redirect('/admin/products');

    }
    catch(error){
        console.log(error);
        res.status(500).send("error")
        
    }
}

module.exports={
    loadProduct,
    loadAddProduct,
    addProduct,
    productEditPage,
    editProduct,
    productListing,
}
