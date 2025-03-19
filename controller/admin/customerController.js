const userSchema=require('../../model/userModel')
const brandSchema=require('../../model/brandModel')

const loadUser=async(req,res)=>{
    try{
        const page=parseInt(req.query.page)||1
        const limit=10
        const skip=(page-1)*limit
        const user=await userSchema.find().sort({username:1}).skip(skip).limit(limit)
        const totalUser=await brandSchema.countDocuments()
        const totalPages=Math.ceil(totalUser/limit)
        res.render('admin/user',{users:user,currentPage:page,totalPages})
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

module.exports={
    loadUser,
    blockUser,
    unblockUser
}