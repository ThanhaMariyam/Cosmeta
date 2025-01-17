const adminSchema=require("../model/adminModel")

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
        res.send("home page")
    }
    catch(err){
        console.log(err)
        res.render('admin/adminLogin',{message:"something went wrong"})
    }
}



module.exports={
    loadLogin,
    login
}