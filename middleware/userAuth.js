const checkSession=(req,res,next)=>{
    if(req.session.user){
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