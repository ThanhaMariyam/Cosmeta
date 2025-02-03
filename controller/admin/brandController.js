const brandSchema=require('../../model/brandModel')

const loadBrand=async(req,res)=>{
    try{
        const page=parseInt(req.query.page)||1
        const limit=10
        const skip=(page-1)*limit
        const brands=await brandSchema.find().skip(skip).limit(limit)
        const totalBrand=await brandSchema.countDocuments()
        const totalPages=Math.ceil(totalBrand/limit)
        res.render('admin/brand',{brands,currentPage:page,totalPages})
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

const brandListing=async(req,res)=>{
    try{
        const brandId=req.params.id
        const brandToUpdate=await brandSchema.findById(brandId)
        if (!brandToUpdate) {
            return res.status(404).send("brand not found");
        }
        const newIsListed = !brandToUpdate.isListed;
        const updatedBrand = await brandSchema.findByIdAndUpdate(
            brandId,
            { isListed: newIsListed },
            { new: true }
        );

        res.redirect('/admin/brand');

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
    loadBrand,
    addBrand,
    brandListing,
    brandEdit
}
