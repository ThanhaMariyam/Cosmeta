const User=require('../model/userModel')
const checkSession=async(req,res,next)=>{
    if(req.session.user){
        const user=await User.findById(req.session.user._id)
        console.log(user)
        console.log(req.session.user)
        if(user && user.isBlocked){
            console.log('fjghv',req.session.user)
            req.session.user=null
            return res.redirect('/login')
        }
        next()
    }
    else{
        res.redirect('/login')
    }
}

const isLogin=(req,res,next)=>{
    if(req.session.user){
        res.redirect('/')
    }
    else{
        next()
    }
}

const loginStatus=(req,res,next)=>{
    res.locals.user=req.session.user || null
    next()
}

module.exports={
    checkSession,
    isLogin,
    loginStatus
}